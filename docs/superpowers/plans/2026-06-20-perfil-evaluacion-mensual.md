# Reorganización de perfil de alumno + Evaluación mensual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate duplicated/static measurement fields from the student profile, move them
into the existing `body_evaluations` history table (extending it with the new fields found
in the paper enrollment form), reorganize `PatientForm.tsx` into the agreed groups, and
extend the existing progress views with an objectives card.

**Architecture:** No new tables. `profiles` loses 13 columns and gains 4. `body_evaluations`
(already built, already has a UI in `EvaluationsPanel.tsx` and a progress view in
`StudentDashboardSection.tsx`) gains 16 new columns (7 scalar, 5 JSONB, 3 text). Pure
computation helpers (skinfold sum, heart-rate zones) live in a new dependency-free module
`client/lib/evaluations.ts` so they can be unit-tested without booting the Supabase client
(the existing `client/services/supabase.ts` creates a real `createClient(...)` at import
time, which is why the codebase's existing tests never import that module directly).

**Tech Stack:** React 18 + TypeScript, Supabase Postgres (RLS), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-20-perfil-evaluacion-mensual-design.md`

**Supabase project:** `lvxktbecpvmbcuucjxpp` (htkCenter). Confirmed before writing this
plan: `profiles` (role=student) has 4 test rows, `body_evaluations`/`strength_evaluations`
have 0 rows — no real data at risk in the column drops below.

---

### Task 1: Database migration — reorganize `profiles`, extend `body_evaluations`

**Files:**
- Create: `migrations/024_profile_reorg_and_evaluations.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ============================================================
-- Migration 024: Profile reorganization + extended evaluations
-- ============================================================
-- Removes from `profiles` the measurement/activity/objective columns
-- that were duplicated with `body_evaluations` (the periodic history
-- table from migration 019) and adds the static fields found when
-- cross-referencing the paper enrollment form ("Formulario inscripción
-- HTK.docx", being retired — all registration now happens in-app).
--
-- Extends `body_evaluations` with the fields that DO change at every
-- professional evaluation: vitals, skinfolds, habits, pain assessment,
-- objectives. See docs/superpowers/specs/2026-06-20-perfil-evaluacion-mensual-design.md
-- ============================================================

-- ---------- profiles: add static fields ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS socio_number text,
  ADD COLUMN IF NOT EXISTS social_media_handle text,
  ADD COLUMN IF NOT EXISTS health_center text,
  ADD COLUMN IF NOT EXISTS social_media_consent boolean NOT NULL DEFAULT false;

-- ---------- profiles: drop fields duplicated with body_evaluations ----------
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS height_cm,
  DROP COLUMN IF EXISTS weight_kg,
  DROP COLUMN IF EXISTS body_fat_pct,
  DROP COLUMN IF EXISTS muscle_mass_pct,
  DROP COLUMN IF EXISTS bone_mass_pct,
  DROP COLUMN IF EXISTS waist_cm,
  DROP COLUMN IF EXISTS hip_cm,
  DROP COLUMN IF EXISTS chest_cm,
  DROP COLUMN IF EXISTS arm_cm,
  DROP COLUMN IF EXISTS thigh_cm,
  DROP COLUMN IF EXISTS calf_cm,
  DROP COLUMN IF EXISTS activity_level,
  DROP COLUMN IF EXISTS objective;

-- ---------- body_evaluations: scalar additions ----------
ALTER TABLE public.body_evaluations
  ADD COLUMN IF NOT EXISTS height_cm numeric(5,2),
  ADD COLUMN IF NOT EXISTS bone_mass_pct numeric(4,1),
  ADD COLUMN IF NOT EXISTS neck_cm numeric(5,1),
  ADD COLUMN IF NOT EXISTS shoulders_cm numeric(5,1),
  ADD COLUMN IF NOT EXISTS resting_heart_rate integer,
  ADD COLUMN IF NOT EXISTS blood_pressure_systolic integer,
  ADD COLUMN IF NOT EXISTS blood_pressure_diastolic integer;

-- ---------- body_evaluations: JSONB groups ----------
ALTER TABLE public.body_evaluations
  ADD COLUMN IF NOT EXISTS skinfolds jsonb,
  ADD COLUMN IF NOT EXISTS habits jsonb,
  ADD COLUMN IF NOT EXISTS max_hr_zones jsonb,
  ADD COLUMN IF NOT EXISTS pain_assessment jsonb,
  ADD COLUMN IF NOT EXISTS objectives jsonb;

-- ---------- body_evaluations: free text ----------
ALTER TABLE public.body_evaluations
  ADD COLUMN IF NOT EXISTS rom_notes text,
  ADD COLUMN IF NOT EXISTS strength_notes text,
  ADD COLUMN IF NOT EXISTS findings text;

-- No RLS changes needed: existing policies on both tables are
-- column-agnostic (USING clauses reference patient_id / is_user_admin()),
-- so they automatically cover the new columns.

-- ---------- Audit verification ----------
-- Run after applying:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'profiles'
--     AND column_name IN ('socio_number','social_media_handle','health_center','social_media_consent');
--   -- expect 4 rows
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'profiles'
--     AND column_name IN ('height_cm','weight_kg','activity_level','objective');
--   -- expect 0 rows
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'body_evaluations'
--     AND column_name IN ('height_cm','bone_mass_pct','neck_cm','shoulders_cm',
--       'resting_heart_rate','blood_pressure_systolic','blood_pressure_diastolic',
--       'skinfolds','habits','max_hr_zones','pain_assessment','objectives',
--       'rom_notes','strength_notes','findings');
--   -- expect 15 rows
```

- [ ] **Step 2: Apply the migration to the live Supabase project**

Use the `mcp__plugin_supabase_supabase__apply_migration` tool with
`project_id: "lvxktbecpvmbcuucjxpp"`, `name: "profile_reorg_and_evaluations"`, and the SQL
body above (the tool applies DDL and records it in Supabase's own migration history,
independent of the local `/migrations` folder convention already used in this repo).

- [ ] **Step 3: Verify with the three audit queries**

Run each audit query from the SQL comment above via
`mcp__plugin_supabase_supabase__execute_sql` with the same `project_id`. Confirm the row
counts match (4, 0, 15) before moving on.

- [ ] **Step 4: Commit the migration file**

```bash
git add migrations/024_profile_reorg_and_evaluations.sql
git commit -m "feat(db): reorganize profile fields and extend body_evaluations for monthly assessment"
```

---

### Task 2: Pure evaluation helpers and types (`client/lib/evaluations.ts`)

**Files:**
- Create: `client/lib/evaluations.ts`
- Test: `client/lib/evaluations.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// client/lib/evaluations.spec.ts
import { describe, it, expect } from "vitest";
import { computeSkinfoldSum, computeHrZones } from "./evaluations";

describe("computeSkinfoldSum", () => {
  it("sums all provided skinfold measurements", () => {
    expect(
      computeSkinfoldSum({
        bicipital: 10, tricipital: 12, subescapular: 14,
        abdominal: 16, suprailiaco: 8, thigh: 20, leg: 6,
      }),
    ).toBe(86);
  });

  it("ignores missing measurements instead of treating them as zero", () => {
    expect(computeSkinfoldSum({ bicipital: 10, tricipital: 12 })).toBe(22);
  });

  it("returns null when nothing was measured", () => {
    expect(computeSkinfoldSum({})).toBeNull();
    expect(computeSkinfoldSum(null)).toBeNull();
    expect(computeSkinfoldSum(undefined)).toBeNull();
  });

  it("rounds to one decimal", () => {
    expect(computeSkinfoldSum({ bicipital: 10.33, tricipital: 12.27 })).toBe(22.6);
  });
});

describe("computeHrZones", () => {
  it("computes the 6 standard training zones from max heart rate", () => {
    expect(computeHrZones(180)).toEqual({
      pct50: 90, pct60: 108, pct70: 126, pct80: 144, pct90: 162, pct100: 180,
    });
  });

  it("returns null for a missing or non-positive max heart rate", () => {
    expect(computeHrZones(null)).toBeNull();
    expect(computeHrZones(undefined)).toBeNull();
    expect(computeHrZones(0)).toBeNull();
    expect(computeHrZones(-5)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm run test -- client/lib/evaluations.spec.ts`
Expected: FAIL with "Cannot find module './evaluations'" (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```typescript
// client/lib/evaluations.ts
/**
 * Pure types and helpers for the monthly student evaluation
 * (body_evaluations table). Deliberately has zero imports from
 * services/supabase so it can be unit-tested without a Supabase client.
 */

export type HabitLevel4 = "no" | "a_veces" | "a_menudo" | "siempre";
export type QualityLevel4 = "malo" | "regular" | "bueno" | "excelente";

export const HABIT_LEVEL_OPTIONS: Array<[HabitLevel4, string]> = [
  ["no", "No"],
  ["a_veces", "A veces"],
  ["a_menudo", "A menudo"],
  ["siempre", "Siempre"],
];

export const QUALITY_LEVEL_OPTIONS: Array<[QualityLevel4, string]> = [
  ["malo", "Malo"],
  ["regular", "Regular"],
  ["bueno", "Bueno"],
  ["excelente", "Excelente"],
];

export interface Skinfolds {
  bicipital?: number;
  tricipital?: number;
  subescapular?: number;
  abdominal?: number;
  suprailiaco?: number;
  thigh?: number;
  leg?: number;
}

export interface Habits {
  smoking?: { level: HabitLevel4; count?: number };
  alcohol?: { level: HabitLevel4; count?: number };
  physical_activity?: { level: HabitLevel4; count?: number };
  nutrition?: { level: QualityLevel4 };
  hydration?: { level: QualityLevel4 };
  rest?: { level: QualityLevel4; hours?: number };
}

export interface MaxHrZones {
  pct50?: number;
  pct60?: number;
  pct70?: number;
  pct80?: number;
  pct90?: number;
  pct100?: number;
}

export interface PainAssessment {
  onset?: string;
  location?: string;
  radiation?: string;
  character?: string;
  intensity_0_10?: number;
  aggravating?: string;
}

export interface EvaluationObjectives {
  specific_1?: string;
  specific_2?: string;
  specific_3?: string;
  general?: string;
}

/** Sum of all provided skinfold measurements (Jackson-Pollock style), rounded to 1 decimal. */
export function computeSkinfoldSum(skinfolds?: Skinfolds | null): number | null {
  if (!skinfolds) return null;
  const values = [
    skinfolds.bicipital, skinfolds.tricipital, skinfolds.subescapular,
    skinfolds.abdominal, skinfolds.suprailiaco, skinfolds.thigh, skinfolds.leg,
  ].filter((v): v is number => v != null && !Number.isNaN(v));
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum * 10) / 10;
}

/** Standard 6-zone training heart rate table from a max heart rate value. */
export function computeHrZones(maxHr?: number | null): MaxHrZones | null {
  if (!maxHr || maxHr <= 0) return null;
  const pct = (p: number) => Math.round(maxHr * (p / 100));
  return {
    pct50: pct(50), pct60: pct(60), pct70: pct(70),
    pct80: pct(80), pct90: pct(90), pct100: pct(100),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm run test -- client/lib/evaluations.spec.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add client/lib/evaluations.ts client/lib/evaluations.spec.ts
git commit -m "feat(evaluations): add pure helpers for skinfold sum and HR zones"
```

---

### Task 3: Update `client/services/supabase.ts` types

**Files:**
- Modify: `client/services/supabase.ts:1698-1799` (PatientProfile, PATIENT_FIELDS, ActivityLevel)
- Modify: `client/services/supabase.ts:2446-2463` (BodyEvaluation)

- [ ] **Step 1: Remove `ActivityLevel` and the dropped `PatientProfile` fields**

Replace (around line 1698-1704):

```typescript
export type Handedness = "diestro" | "zurdo" | "ambidiestro";
export type ActivityLevel =
  | "sedentario" | "ligero" | "moderado" | "activo" | "muy_activo" | "atleta";
export type BloodType =
  | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type MaritalStatus =
  | "soltero" | "casado" | "conviviente" | "divorciado" | "viudo" | "otro";
```

with:

```typescript
export type Handedness = "diestro" | "zurdo" | "ambidiestro";
export type BloodType =
  | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type MaritalStatus =
  | "soltero" | "casado" | "conviviente" | "divorciado" | "viudo" | "otro";
```

- [ ] **Step 2: Update the `PatientProfile` interface**

Replace the full interface (lines 1723-1783) with:

```typescript
export interface PatientProfile {
  id: string;
  full_name: string;
  email?: string;
  rut_dni?: string;
  birth_date?: string;
  gender?: string;
  marital_status?: MaritalStatus | string;
  has_children?: boolean;
  num_children?: number;
  phone?: string;
  address?: string;
  profession?: string;
  occupation?: string;
  photo_url?: string;
  socio_number?: string;
  social_media_handle?: string;
  // PAR-Q
  parq_completed_at?: string;
  parq_answers?: Record<string, boolean>;
  parq_cleared?: boolean;
  parq_clearance_notes?: string;
  handedness?: Handedness | string;
  blood_type?: BloodType | string;
  health_center?: string;
  allergies?: string;
  diseases?: string[];
  surgeries?: string;
  ailments?: string;
  injuries?: string;
  sports?: SportEntry[];
  drugs?: SubstanceEntry[];
  medications?: MedicationEntry[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  medical_info_extra?: string;
  personal_info_extra?: string;
  insurer?: string;
  joined_at?: string;
  referral_source?: string;
  informed_consent_signed?: boolean;
  social_media_consent?: boolean;
  is_paused?: boolean;
  paused_at?: string;
  pause_reason?: string;
  pause_resume_at?: string;
  role?: "student" | "teacher";
  is_admin?: boolean;
  professional_type?: ProfessionalType;
}
```

- [ ] **Step 3: Update `PATIENT_FIELDS`**

Replace (lines 1785-1799):

```typescript
const PATIENT_FIELDS = `
  id, full_name, email, rut_dni, birth_date, gender, marital_status,
  has_children, num_children, phone, address, profession, occupation, photo_url,
  height_cm, weight_kg, body_fat_pct, muscle_mass_pct, bone_mass_pct,
  waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm, calf_cm,
  parq_completed_at, parq_answers, parq_cleared, parq_clearance_notes,
  activity_level, objective, handedness,
  blood_type, allergies, diseases, surgeries, ailments, injuries,
  sports, drugs, medications,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  medical_info_extra, personal_info_extra,
  insurer, joined_at, referral_source, informed_consent_signed,
  is_paused, paused_at, pause_reason, pause_resume_at,
  role, is_admin, professional_type
`;
```

with:

```typescript
const PATIENT_FIELDS = `
  id, full_name, email, rut_dni, birth_date, gender, marital_status,
  has_children, num_children, phone, address, profession, occupation, photo_url,
  socio_number, social_media_handle,
  parq_completed_at, parq_answers, parq_cleared, parq_clearance_notes,
  handedness,
  blood_type, health_center, allergies, diseases, surgeries, ailments, injuries,
  sports, drugs, medications,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  medical_info_extra, personal_info_extra,
  insurer, joined_at, referral_source, informed_consent_signed, social_media_consent,
  is_paused, paused_at, pause_reason, pause_resume_at,
  role, is_admin, professional_type
`;
```

- [ ] **Step 4: Extend the `BodyEvaluation` interface**

Add the import at the top of `client/services/supabase.ts` (after the existing imports,
around line 2):

```typescript
import type {
  Skinfolds, Habits, MaxHrZones, PainAssessment, EvaluationObjectives,
} from "@/lib/evaluations";
```

Replace the `BodyEvaluation` interface (lines 2446-2463):

```typescript
export interface BodyEvaluation {
  id: string;
  patient_id: string;
  professional_id?: string | null;
  measured_at: string;       // YYYY-MM-DD
  height_cm?: number | null;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  muscle_mass_pct?: number | null;
  bone_mass_pct?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  chest_cm?: number | null;
  arm_cm?: number | null;
  thigh_cm?: number | null;
  calf_cm?: number | null;
  neck_cm?: number | null;
  shoulders_cm?: number | null;
  skinfolds?: Skinfolds | null;
  resting_heart_rate?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  max_hr_zones?: MaxHrZones | null;
  habits?: Habits | null;
  pain_assessment?: PainAssessment | null;
  rom_notes?: string | null;
  strength_notes?: string | null;
  findings?: string | null;
  objectives?: EvaluationObjectives | null;
  notes?: string | null;
  created_at: string;
}
```

`listBodyEvaluations`, `createBodyEvaluation`, and `deleteBodyEvaluation` (lines 2477-2514)
need no changes — they already use `select("*")` / spread the payload, so the new columns
flow through automatically.

- [ ] **Step 5: Typecheck**

Run: `pnpm run typecheck`
Expected: errors only in `PatientForm.tsx` (still references the removed fields) and
`EvaluationsPanel.tsx` (doesn't yet set the new required UI) — both fixed in Tasks 4-5.
No errors should reference `supabase.ts` itself.

- [ ] **Step 6: Commit**

```bash
git add client/services/supabase.ts
git commit -m "refactor(types): move measurement/activity/objective fields from profiles to body_evaluations"
```

---

### Task 4: Reorganize `PatientForm.tsx`

**Files:**
- Modify: `client/components/dashboard/PatientForm.tsx`

- [ ] **Step 1: Update imports — drop BMI helpers, no longer used**

Replace (lines 1-16):

```typescript
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Save, Loader2, Plus, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  getPatient,
  updatePatient,
  computeAge,
  computeBMI,
  bmiCategory,
  type PatientProfile,
  type SportEntry,
  type SubstanceEntry,
  type MedicationEntry,
} from "@/services/supabase";
import { isValidRut, formatRut, cleanRut } from "@/lib/rut";
import PhotoUploader from "./PhotoUploader";
```

with:

```typescript
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Save, Loader2, Plus, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  getPatient,
  updatePatient,
  computeAge,
  type PatientProfile,
  type SportEntry,
  type SubstanceEntry,
  type MedicationEntry,
} from "@/services/supabase";
import { isValidRut, formatRut, cleanRut } from "@/lib/rut";
import PhotoUploader from "./PhotoUploader";
```

- [ ] **Step 2: Update `EMPTY` defaults**

Replace (lines 59-97):

```typescript
const EMPTY: Partial<PatientProfile> = {
  full_name: "",
  email: "",
  rut_dni: "",
  birth_date: "",
  gender: "",
  marital_status: "",
  has_children: false,
  num_children: 0,
  phone: "",
  address: "",
  profession: "",
  occupation: "",
  height_cm: undefined,
  weight_kg: undefined,
  body_fat_pct: undefined,
  muscle_mass_pct: undefined,
  bone_mass_pct: undefined,
  activity_level: "",
  objective: "",
  handedness: "",
  blood_type: "",
  allergies: "",
  diseases: [],
  surgeries: "",
  ailments: "",
  injuries: "",
  sports: [],
  drugs: [],
  medications: [],
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relation: "",
  medical_info_extra: "",
  personal_info_extra: "",
  insurer: "",
  referral_source: "",
  informed_consent_signed: false,
};
```

with:

```typescript
const EMPTY: Partial<PatientProfile> = {
  full_name: "",
  email: "",
  rut_dni: "",
  birth_date: "",
  gender: "",
  marital_status: "",
  has_children: false,
  num_children: 0,
  phone: "",
  address: "",
  profession: "",
  occupation: "",
  socio_number: "",
  social_media_handle: "",
  handedness: "",
  blood_type: "",
  health_center: "",
  allergies: "",
  diseases: [],
  surgeries: "",
  ailments: "",
  injuries: "",
  sports: [],
  drugs: [],
  medications: [],
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relation: "",
  medical_info_extra: "",
  personal_info_extra: "",
  insurer: "",
  referral_source: "",
  informed_consent_signed: false,
  social_media_consent: false,
};
```

- [ ] **Step 3: Update `SectionId` and the `open` state — drop `body`/`measurements`/`goals`, add `contact`**

Replace (lines 99-113):

```typescript
type SectionId =
  | "photo" | "personal" | "professional" | "body" | "measurements"
  | "goals" | "parq" | "medical"
  | "conditions" | "sports" | "substances" | "emergency" | "extra" | "admin";

export default function PatientForm({ patientId, onSaved, onCancel }: PatientFormProps) {
  const [form, setForm] = useState<Partial<PatientProfile>>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    photo: true, personal: true, professional: false, body: false,
    measurements: false, goals: false, parq: false, medical: false,
    conditions: false, sports: false, substances: false,
    emergency: false, extra: false, admin: false,
  });
  const [rutTouched, setRutTouched] = useState(false);
```

with:

```typescript
type SectionId =
  | "photo" | "personal" | "contact" | "professional" | "parq" | "medical"
  | "conditions" | "sports" | "substances" | "emergency" | "extra" | "admin";

export default function PatientForm({ patientId, onSaved, onCancel }: PatientFormProps) {
  const [form, setForm] = useState<Partial<PatientProfile>>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    photo: true, personal: true, contact: true, professional: false,
    parq: false, medical: false,
    conditions: false, sports: false, substances: false,
    emergency: false, extra: false, admin: false,
  });
  const [rutTouched, setRutTouched] = useState(false);
```

- [ ] **Step 4: Remove the BMI computation line**

Replace (line 131-132):

```typescript
  const age = computeAge(form.birth_date as string | undefined);
  const bmi = computeBMI(form.height_cm as number, form.weight_kg as number);
```

with:

```typescript
  const age = computeAge(form.birth_date as string | undefined);
```

- [ ] **Step 5: Trim "Datos personales", add new "Contacto" section, drop email/phone/address from personal**

Replace the `"personal"` section (lines 228-277):

```typescript
      <Section id="personal" title="Datos personales" open={open.personal} onToggle={toggle}>
        <Grid>
          <Field label="Nombre completo *"><Input value={form.full_name || ""} onChange={(v) => set("full_name", v)} /></Field>
          <Field label="RUT / DNI">
            <Input
              value={form.rut_dni || ""}
              onChange={(v) => { set("rut_dni", v); setRutTouched(true); }}
              onBlur={() => {
                if (form.rut_dni && isValidRut(form.rut_dni)) {
                  set("rut_dni", formatRut(form.rut_dni));
                }
              }}
              placeholder="12.345.678-9"
            />
            {rutTouched && form.rut_dni && !rutValid && (
              <p className="text-[10px] text-red-400 mt-1">RUT inválido (verifica formato y dígito)</p>
            )}
            {rutTouched && form.rut_dni && rutValid && (
              <p className="text-[10px] text-emerald-400 mt-1">RUT válido ✓</p>
            )}
          </Field>
          <Field label="Email"><Input type="email" value={form.email || ""} onChange={(v) => set("email", v)} /></Field>
          <Field label="Teléfono"><Input value={form.phone || ""} onChange={(v) => set("phone", v)} /></Field>
          <Field label={`Fecha de nacimiento ${age != null ? `(${age} años)` : ""}`}>
            <Input type="date" value={form.birth_date || ""} onChange={(v) => set("birth_date", v)} />
          </Field>
          <Field label="Género">
            <Select value={form.gender || ""} onChange={(v) => set("gender", v)}
              options={[["", "—"], ["M", "Masculino"], ["F", "Femenino"], ["X", "Otro / Prefiere no decir"]]} />
          </Field>
          <Field label="Estado civil">
            <Select value={form.marital_status || ""} onChange={(v) => set("marital_status", v as any)}
              options={[["", "—"], ["soltero", "Soltero/a"], ["casado", "Casado/a"], ["conviviente", "Conviviente"], ["divorciado", "Divorciado/a"], ["viudo", "Viudo/a"], ["otro", "Otro"]]} />
          </Field>
          <Field label="Hijos">
            <div className="flex gap-2">
              <label className="flex items-center gap-1 text-sm text-white">
                <input type="checkbox" checked={!!form.has_children}
                  onChange={(e) => set("has_children", e.target.checked)} />
                Sí
              </label>
              {form.has_children && (
                <Input type="number" value={String(form.num_children ?? 0)}
                  onChange={(v) => set("num_children", parseInt(v) || 0)} className="w-16" />
              )}
            </div>
          </Field>
          <Field label="Dirección" full><Input value={form.address || ""} onChange={(v) => set("address", v)} /></Field>
        </Grid>
      </Section>
```

with:

```typescript
      <Section id="personal" title="Datos personales" open={open.personal} onToggle={toggle}>
        <Grid>
          <Field label="Nombre completo *"><Input value={form.full_name || ""} onChange={(v) => set("full_name", v)} /></Field>
          <Field label="RUT / DNI">
            <Input
              value={form.rut_dni || ""}
              onChange={(v) => { set("rut_dni", v); setRutTouched(true); }}
              onBlur={() => {
                if (form.rut_dni && isValidRut(form.rut_dni)) {
                  set("rut_dni", formatRut(form.rut_dni));
                }
              }}
              placeholder="12.345.678-9"
            />
            {rutTouched && form.rut_dni && !rutValid && (
              <p className="text-[10px] text-red-400 mt-1">RUT inválido (verifica formato y dígito)</p>
            )}
            {rutTouched && form.rut_dni && rutValid && (
              <p className="text-[10px] text-emerald-400 mt-1">RUT válido ✓</p>
            )}
          </Field>
          <Field label="N° de socio"><Input value={form.socio_number || ""} onChange={(v) => set("socio_number", v)} /></Field>
          <Field label={`Fecha de nacimiento ${age != null ? `(${age} años)` : ""}`}>
            <Input type="date" value={form.birth_date || ""} onChange={(v) => set("birth_date", v)} />
          </Field>
          <Field label="Género">
            <Select value={form.gender || ""} onChange={(v) => set("gender", v)}
              options={[["", "—"], ["M", "Masculino"], ["F", "Femenino"], ["X", "Otro / Prefiere no decir"]]} />
          </Field>
          <Field label="Estado civil">
            <Select value={form.marital_status || ""} onChange={(v) => set("marital_status", v as any)}
              options={[["", "—"], ["soltero", "Soltero/a"], ["casado", "Casado/a"], ["conviviente", "Conviviente"], ["divorciado", "Divorciado/a"], ["viudo", "Viudo/a"], ["otro", "Otro"]]} />
          </Field>
          <Field label="Hijos">
            <div className="flex gap-2">
              <label className="flex items-center gap-1 text-sm text-white">
                <input type="checkbox" checked={!!form.has_children}
                  onChange={(e) => set("has_children", e.target.checked)} />
                Sí
              </label>
              {form.has_children && (
                <Input type="number" value={String(form.num_children ?? 0)}
                  onChange={(v) => set("num_children", parseInt(v) || 0)} className="w-16" />
              )}
            </div>
          </Field>
          <Field label="Lateralidad">
            <Select value={form.handedness || ""} onChange={(v) => set("handedness", v as any)}
              options={[["", "—"], ["diestro", "Diestro"], ["zurdo", "Zurdo"], ["ambidiestro", "Ambidiestro"]]} />
          </Field>
        </Grid>
      </Section>

      <Section id="contact" title="Contacto" open={open.contact} onToggle={toggle}>
        <Grid>
          <Field label="Email"><Input type="email" value={form.email || ""} onChange={(v) => set("email", v)} /></Field>
          <Field label="Teléfono"><Input value={form.phone || ""} onChange={(v) => set("phone", v)} /></Field>
          <Field label="Dirección" full><Input value={form.address || ""} onChange={(v) => set("address", v)} /></Field>
          <Field label="@Redes sociales"><Input value={form.social_media_handle || ""} onChange={(v) => set("social_media_handle", v)} placeholder="@usuario" /></Field>
        </Grid>
      </Section>
```

- [ ] **Step 6: Delete the "Composición corporal", "Mediciones" and "Actividad y objetivos" sections**

Delete entirely (lines 286-335 in the original file — the `id="body"`, `id="measurements"`
and `id="goals"` `<Section>` blocks, including the index/cintura-cadera paragraph and the
"Lateralidad"/"Objetivo" fields, which were moved or dropped in the previous steps):

```typescript
      <Section id="body" title="Composición corporal" open={open.body} onToggle={toggle}>
        ...
      </Section>

      <Section id="measurements" title="Mediciones (circunferencias en cm)" open={open.measurements} onToggle={toggle}>
        ...
      </Section>

      <Section id="goals" title="Actividad y objetivos" open={open.goals} onToggle={toggle}>
        ...
      </Section>
```

(Replace with nothing — the next remaining section in the file is `id="parq"`.)

- [ ] **Step 7: Add `health_center` to the "Datos médicos básicos" section**

Replace (lines 430-445):

```typescript
      <Section id="medical" title="Datos médicos básicos" open={open.medical} onToggle={toggle}>
        <Grid>
          <Field label="Tipo de sangre">
            <Select value={form.blood_type || ""} onChange={(v) => set("blood_type", v as any)}
              options={[["", "—"], ["A+", "A+"], ["A-", "A-"], ["B+", "B+"], ["B-", "B-"], ["AB+", "AB+"], ["AB-", "AB-"], ["O+", "O+"], ["O-", "O-"]]} />
          </Field>
          <Field label="Aseguradora">
            <Select value={form.insurer || ""} onChange={(v) => set("insurer", v)}
              options={[["", "—"], ["Fonasa", "Fonasa"], ["Isapre", "Isapre"], ["Particular", "Particular"], ["Otro", "Otro"]]} />
          </Field>
          <Field label="Alergias" full><Textarea value={form.allergies || ""} onChange={(v) => set("allergies", v)} rows={2} /></Field>
          <Field label="Cirugías" full><Textarea value={form.surgeries || ""} onChange={(v) => set("surgeries", v)} rows={2} placeholder="Tipo, fecha aprox., complicaciones..." /></Field>
          <Field label="Dolencias actuales" full><Textarea value={form.ailments || ""} onChange={(v) => set("ailments", v)} rows={2} /></Field>
          <Field label="Lesiones (actuales/pasadas)" full><Textarea value={form.injuries || ""} onChange={(v) => set("injuries", v)} rows={2} /></Field>
        </Grid>
      </Section>
```

with:

```typescript
      <Section id="medical" title="Datos médicos básicos" open={open.medical} onToggle={toggle}>
        <Grid>
          <Field label="Tipo de sangre">
            <Select value={form.blood_type || ""} onChange={(v) => set("blood_type", v as any)}
              options={[["", "—"], ["A+", "A+"], ["A-", "A-"], ["B+", "B+"], ["B-", "B-"], ["AB+", "AB+"], ["AB-", "AB-"], ["O+", "O+"], ["O-", "O-"]]} />
          </Field>
          <Field label="Aseguradora">
            <Select value={form.insurer || ""} onChange={(v) => set("insurer", v)}
              options={[["", "—"], ["Fonasa", "Fonasa"], ["Isapre", "Isapre"], ["Particular", "Particular"], ["Otro", "Otro"]]} />
          </Field>
          <Field label="Centro de salud al cual acudir"><Input value={form.health_center || ""} onChange={(v) => set("health_center", v)} /></Field>
          <Field label="Alergias" full><Textarea value={form.allergies || ""} onChange={(v) => set("allergies", v)} rows={2} /></Field>
          <Field label="Cirugías" full><Textarea value={form.surgeries || ""} onChange={(v) => set("surgeries", v)} rows={2} placeholder="Tipo, fecha aprox., complicaciones..." /></Field>
          <Field label="Dolencias actuales" full><Textarea value={form.ailments || ""} onChange={(v) => set("ailments", v)} rows={2} /></Field>
          <Field label="Lesiones (actuales/pasadas)" full><Textarea value={form.injuries || ""} onChange={(v) => set("injuries", v)} rows={2} /></Field>
        </Grid>
      </Section>
```

- [ ] **Step 8: Add `social_media_consent` to "Datos administrativos"**

Replace (lines 526-540):

```typescript
      <Section id="admin" title="Datos administrativos" open={open.admin} onToggle={toggle}>
        <Grid>
          <Field label="Cómo nos conoció">
            <Select value={form.referral_source || ""} onChange={(v) => set("referral_source", v)}
              options={[["", "—"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["google", "Google"], ["referido", "Referido por otro alumno"], ["medico", "Recomendación médica"], ["otro", "Otro"]]} />
          </Field>
          <Field label="Consentimiento informado">
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" checked={!!form.informed_consent_signed}
                onChange={(e) => set("informed_consent_signed", e.target.checked)} />
              Firmado
            </label>
          </Field>
        </Grid>
      </Section>
```

with:

```typescript
      <Section id="admin" title="Datos administrativos" open={open.admin} onToggle={toggle}>
        <Grid>
          <Field label="Cómo nos conoció">
            <Select value={form.referral_source || ""} onChange={(v) => set("referral_source", v)}
              options={[["", "—"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["google", "Google"], ["referido", "Referido por otro alumno"], ["medico", "Recomendación médica"], ["otro", "Otro"]]} />
          </Field>
          <Field label="Consentimiento informado">
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" checked={!!form.informed_consent_signed}
                onChange={(e) => set("informed_consent_signed", e.target.checked)} />
              Firmado
            </label>
          </Field>
          <Field label="Consentimiento redes sociales">
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" checked={!!form.social_media_consent}
                onChange={(e) => set("social_media_consent", e.target.checked)} />
              Autoriza ser etiquetado en publicaciones
            </label>
          </Field>
        </Grid>
      </Section>
```

- [ ] **Step 9: Typecheck**

Run: `pnpm run typecheck`
Expected: no errors referencing `PatientForm.tsx`.

- [ ] **Step 10: Commit**

```bash
git add client/components/dashboard/PatientForm.tsx
git commit -m "refactor(patient-form): drop measurement fields, add socio_number/redes/health_center/consent"
```

---

### Task 5: Extend `EvaluationsPanel.tsx` with the new evaluation fields

**Files:**
- Modify: `client/components/dashboard/EvaluationsPanel.tsx` (full-file rewrite of `BodySection`
  and its form state — the change touches imports, state shape, save payload, and JSX
  throughout the function, so it's clearer as one rewritten block than a series of
  micro-patches)

- [ ] **Step 1: Replace the file's imports and the `BodySection` function**

Replace (lines 1-248, i.e. everything up to and including the closing brace of
`BodySection`, leaving `StrengthSection` and the shared `Field` helper untouched below it):

```typescript
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Activity, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  listBodyEvaluations,
  createBodyEvaluation,
  deleteBodyEvaluation,
  listStrengthEvaluations,
  createStrengthEvaluation,
  deleteStrengthEvaluation,
  STRENGTH_EXERCISES,
  type BodyEvaluation,
  type StrengthEvaluation,
  type StrengthExerciseKey,
} from "@/services/supabase";
import {
  HABIT_LEVEL_OPTIONS,
  QUALITY_LEVEL_OPTIONS,
  computeSkinfoldSum,
  computeHrZones,
  type Skinfolds,
  type Habits,
  type PainAssessment,
  type EvaluationObjectives,
} from "@/lib/evaluations";

interface Props {
  patientId: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function EvaluationsPanel({ patientId }: Props) {
  const { user } = useAuth();
  const [body, setBody] = useState<BodyEvaluation[]>([]);
  const [strength, setStrength] = useState<StrengthEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [b, s] = await Promise.all([
      listBodyEvaluations(patientId),
      listStrengthEvaluations(patientId),
    ]);
    if (b.success) setBody(b.data || []);
    if (s.success) setStrength(s.data || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <BodySection
        items={body}
        patientId={patientId}
        professionalId={user?.id ?? null}
        onChanged={refresh}
      />
      <StrengthSection
        items={strength}
        patientId={patientId}
        professionalId={user?.id ?? null}
        onChanged={refresh}
      />
    </div>
  );
}

// =============================================================
// Body composition + extended monthly assessment
// =============================================================
const EMPTY_BODY_FORM = {
  measured_at: todayIso(),
  height_cm: "", weight_kg: "", body_fat_pct: "", muscle_mass_pct: "", bone_mass_pct: "",
  waist_cm: "", hip_cm: "", chest_cm: "", arm_cm: "", thigh_cm: "", calf_cm: "",
  neck_cm: "", shoulders_cm: "",
  skinfolds: { bicipital: "", tricipital: "", subescapular: "", abdominal: "", suprailiaco: "", thigh: "", leg: "" },
  resting_heart_rate: "", blood_pressure_systolic: "", blood_pressure_diastolic: "", max_heart_rate: "",
  habits: {
    smoking: { level: "no" as const, count: "" },
    alcohol: { level: "no" as const, count: "" },
    physical_activity: { level: "no" as const, count: "" },
    nutrition: { level: "regular" as const },
    hydration: { level: "regular" as const },
    rest: { level: "regular" as const, hours: "" },
  },
  pain_assessment: { onset: "", location: "", radiation: "", character: "", intensity_0_10: "", aggravating: "" },
  rom_notes: "", strength_notes: "", findings: "",
  objectives: { specific_1: "", specific_2: "", specific_3: "", general: "" },
  notes: "",
};

function BodySection({
  items, patientId, professionalId, onChanged,
}: {
  items: BodyEvaluation[];
  patientId: string;
  professionalId: string | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_BODY_FORM);
  const [expanded, setExpanded] = useState<string | null>(null);

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const setSkinfold = (key: keyof typeof form.skinfolds, v: string) =>
    setForm((f) => ({ ...f, skinfolds: { ...f.skinfolds, [key]: v } }));

  const setHabitLevel = (key: keyof typeof form.habits, level: string) =>
    setForm((f) => ({ ...f, habits: { ...f.habits, [key]: { ...(f.habits as any)[key], level } } }));

  const setHabitField = (key: keyof typeof form.habits, field: string, v: string) =>
    setForm((f) => ({ ...f, habits: { ...f.habits, [key]: { ...(f.habits as any)[key], [field]: v } } }));

  const setPain = (key: keyof typeof form.pain_assessment, v: string) =>
    setForm((f) => ({ ...f, pain_assessment: { ...f.pain_assessment, [key]: v } }));

  const setObjective = (key: keyof typeof form.objectives, v: string) =>
    setForm((f) => ({ ...f, objectives: { ...f.objectives, [key]: v } }));

  const save = async () => {
    setSaving(true);

    const skinfolds: Skinfolds = {
      bicipital: num(form.skinfolds.bicipital) ?? undefined,
      tricipital: num(form.skinfolds.tricipital) ?? undefined,
      subescapular: num(form.skinfolds.subescapular) ?? undefined,
      abdominal: num(form.skinfolds.abdominal) ?? undefined,
      suprailiaco: num(form.skinfolds.suprailiaco) ?? undefined,
      thigh: num(form.skinfolds.thigh) ?? undefined,
      leg: num(form.skinfolds.leg) ?? undefined,
    };
    const hasSkinfolds = Object.values(skinfolds).some((v) => v != null);

    const habits: Habits = {
      smoking: { level: form.habits.smoking.level, count: num(form.habits.smoking.count) ?? undefined },
      alcohol: { level: form.habits.alcohol.level, count: num(form.habits.alcohol.count) ?? undefined },
      physical_activity: { level: form.habits.physical_activity.level, count: num(form.habits.physical_activity.count) ?? undefined },
      nutrition: { level: form.habits.nutrition.level },
      hydration: { level: form.habits.hydration.level },
      rest: { level: form.habits.rest.level, hours: num(form.habits.rest.hours) ?? undefined },
    };

    const painAssessment: PainAssessment = {
      onset: form.pain_assessment.onset.trim() || undefined,
      location: form.pain_assessment.location.trim() || undefined,
      radiation: form.pain_assessment.radiation.trim() || undefined,
      character: form.pain_assessment.character.trim() || undefined,
      intensity_0_10: num(form.pain_assessment.intensity_0_10) ?? undefined,
      aggravating: form.pain_assessment.aggravating.trim() || undefined,
    };
    const hasPainAssessment = Object.values(painAssessment).some((v) => v != null);

    const objectives: EvaluationObjectives = {
      specific_1: form.objectives.specific_1.trim() || undefined,
      specific_2: form.objectives.specific_2.trim() || undefined,
      specific_3: form.objectives.specific_3.trim() || undefined,
      general: form.objectives.general.trim() || undefined,
    };
    const hasObjectives = Object.values(objectives).some((v) => v != null);

    const r = await createBodyEvaluation({
      patient_id: patientId,
      professional_id: professionalId,
      measured_at: form.measured_at,
      height_cm: num(form.height_cm),
      weight_kg: num(form.weight_kg),
      body_fat_pct: num(form.body_fat_pct),
      muscle_mass_pct: num(form.muscle_mass_pct),
      bone_mass_pct: num(form.bone_mass_pct),
      waist_cm: num(form.waist_cm),
      hip_cm: num(form.hip_cm),
      chest_cm: num(form.chest_cm),
      arm_cm: num(form.arm_cm),
      thigh_cm: num(form.thigh_cm),
      calf_cm: num(form.calf_cm),
      neck_cm: num(form.neck_cm),
      shoulders_cm: num(form.shoulders_cm),
      skinfolds: hasSkinfolds ? skinfolds : null,
      resting_heart_rate: num(form.resting_heart_rate),
      blood_pressure_systolic: num(form.blood_pressure_systolic),
      blood_pressure_diastolic: num(form.blood_pressure_diastolic),
      max_hr_zones: computeHrZones(num(form.max_heart_rate)),
      habits,
      pain_assessment: hasPainAssessment ? painAssessment : null,
      rom_notes: form.rom_notes.trim() || null,
      strength_notes: form.strength_notes.trim() || null,
      findings: form.findings.trim() || null,
      objectives: hasObjectives ? objectives : null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (r.success) {
      toast.success("Evaluación registrada");
      setForm(EMPTY_BODY_FORM);
      setOpen(false);
      onChanged();
    } else {
      toast.error(`Error: ${r.error}`);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    const r = await deleteBodyEvaluation(id);
    if (r.success) { toast.success("Eliminada"); onChanged(); }
    else toast.error(`Error: ${r.error}`);
  };

  const skinfoldSumPreview = computeSkinfoldSum({
    bicipital: num(form.skinfolds.bicipital) ?? undefined,
    tricipital: num(form.skinfolds.tricipital) ?? undefined,
    subescapular: num(form.skinfolds.subescapular) ?? undefined,
    abdominal: num(form.skinfolds.abdominal) ?? undefined,
    suprailiaco: num(form.skinfolds.suprailiaco) ?? undefined,
    thigh: num(form.skinfolds.thigh) ?? undefined,
    leg: num(form.skinfolds.leg) ?? undefined,
  });

  const hasExtendedData = (b: BodyEvaluation) =>
    !!(b.skinfolds || b.habits || b.pain_assessment || b.objectives || b.rom_notes || b.strength_notes || b.findings);

  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-white font-semibold font-lexend text-sm">Evaluación mensual</h3>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff]/15 text-[#00d4ff] text-xs font-semibold hover:bg-[#00d4ff]/25 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          {open ? "Cancelar" : "Nueva evaluación"}
        </button>
      </header>

      {open && (
        <div className="bg-[#0f131a] border border-white/10 rounded-xl p-4 mb-4 space-y-5">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Antropometría</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Fecha" type="date" value={form.measured_at}
                onChange={(v) => setForm({ ...form, measured_at: v })} />
              <Field label="Estatura (cm)" value={form.height_cm} onChange={(v) => setForm({ ...form, height_cm: v })} />
              <Field label="Peso (kg)" value={form.weight_kg} onChange={(v) => setForm({ ...form, weight_kg: v })} />
              <Field label="% Grasa" value={form.body_fat_pct} onChange={(v) => setForm({ ...form, body_fat_pct: v })} />
              <Field label="% Músculo" value={form.muscle_mass_pct} onChange={(v) => setForm({ ...form, muscle_mass_pct: v })} />
              <Field label="% Hueso" value={form.bone_mass_pct} onChange={(v) => setForm({ ...form, bone_mass_pct: v })} />
              <Field label="Cuello (cm)" value={form.neck_cm} onChange={(v) => setForm({ ...form, neck_cm: v })} />
              <Field label="Hombros (cm)" value={form.shoulders_cm} onChange={(v) => setForm({ ...form, shoulders_cm: v })} />
              <Field label="Cintura (cm)" value={form.waist_cm} onChange={(v) => setForm({ ...form, waist_cm: v })} />
              <Field label="Cadera (cm)" value={form.hip_cm} onChange={(v) => setForm({ ...form, hip_cm: v })} />
              <Field label="Pecho (cm)" value={form.chest_cm} onChange={(v) => setForm({ ...form, chest_cm: v })} />
              <Field label="Brazo (cm)" value={form.arm_cm} onChange={(v) => setForm({ ...form, arm_cm: v })} />
              <Field label="Muslo (cm)" value={form.thigh_cm} onChange={(v) => setForm({ ...form, thigh_cm: v })} />
              <Field label="Pantorrilla (cm)" value={form.calf_cm} onChange={(v) => setForm({ ...form, calf_cm: v })} />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase mb-2">
              Pliegues cutáneos (mm){skinfoldSumPreview != null && (
                <span className="text-[#00d4ff] ml-2 normal-case">Sumatoria: {skinfoldSumPreview} mm</span>
              )}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Bicipital" value={form.skinfolds.bicipital} onChange={(v) => setSkinfold("bicipital", v)} />
              <Field label="Tricipital" value={form.skinfolds.tricipital} onChange={(v) => setSkinfold("tricipital", v)} />
              <Field label="Subescapular" value={form.skinfolds.subescapular} onChange={(v) => setSkinfold("subescapular", v)} />
              <Field label="Abdominal" value={form.skinfolds.abdominal} onChange={(v) => setSkinfold("abdominal", v)} />
              <Field label="Suprailiaco" value={form.skinfolds.suprailiaco} onChange={(v) => setSkinfold("suprailiaco", v)} />
              <Field label="Muslo" value={form.skinfolds.thigh} onChange={(v) => setSkinfold("thigh", v)} />
              <Field label="Pierna" value={form.skinfolds.leg} onChange={(v) => setSkinfold("leg", v)} />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Signos vitales</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="FC reposo (bpm)" value={form.resting_heart_rate} onChange={(v) => setForm({ ...form, resting_heart_rate: v })} />
              <Field label="Presión sistólica" value={form.blood_pressure_systolic} onChange={(v) => setForm({ ...form, blood_pressure_systolic: v })} />
              <Field label="Presión diastólica" value={form.blood_pressure_diastolic} onChange={(v) => setForm({ ...form, blood_pressure_diastolic: v })} />
              <Field label="FC máxima (para zonas)" value={form.max_heart_rate} onChange={(v) => setForm({ ...form, max_heart_rate: v })} />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Hábitos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <HabitField label="Tabaquismo" level={form.habits.smoking.level} count={form.habits.smoking.count}
                onLevel={(v) => setHabitLevel("smoking", v)} onCount={(v) => setHabitField("smoking", "count", v)} scale={HABIT_LEVEL_OPTIONS} />
              <HabitField label="Alcohol" level={form.habits.alcohol.level} count={form.habits.alcohol.count}
                onLevel={(v) => setHabitLevel("alcohol", v)} onCount={(v) => setHabitField("alcohol", "count", v)} scale={HABIT_LEVEL_OPTIONS} />
              <HabitField label="Actividad física" level={form.habits.physical_activity.level} count={form.habits.physical_activity.count}
                onLevel={(v) => setHabitLevel("physical_activity", v)} onCount={(v) => setHabitField("physical_activity", "count", v)} scale={HABIT_LEVEL_OPTIONS} countLabel="x/semana" />
              <HabitField label="Alimentación" level={form.habits.nutrition.level}
                onLevel={(v) => setHabitLevel("nutrition", v)} scale={QUALITY_LEVEL_OPTIONS} />
              <HabitField label="Hidratación" level={form.habits.hydration.level}
                onLevel={(v) => setHabitLevel("hydration", v)} scale={QUALITY_LEVEL_OPTIONS} />
              <HabitField label="Descanso" level={form.habits.rest.level} count={form.habits.rest.hours}
                onLevel={(v) => setHabitLevel("rest", v)} onCount={(v) => setHabitField("rest", "hours", v)} scale={QUALITY_LEVEL_OPTIONS} countLabel="hrs/noche" />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Evaluación del dolor (si aplica)</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Aparición" value={form.pain_assessment.onset} onChange={(v) => setPain("onset", v)} />
              <Field label="Localización" value={form.pain_assessment.location} onChange={(v) => setPain("location", v)} />
              <Field label="Irradiación" value={form.pain_assessment.radiation} onChange={(v) => setPain("radiation", v)} />
              <Field label="Carácter" value={form.pain_assessment.character} onChange={(v) => setPain("character", v)} />
              <Field label="Intensidad (0-10)" value={form.pain_assessment.intensity_0_10} onChange={(v) => setPain("intensity_0_10", v)} />
              <Field label="Agravantes" value={form.pain_assessment.aggravating} onChange={(v) => setPain("aggravating", v)} />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Evaluación kinésica</p>
            <div className="space-y-2">
              <TextField label="ROM (rango de movimiento)" value={form.rom_notes} onChange={(v) => setForm({ ...form, rom_notes: v })} />
              <TextField label="Fuerza (observación cualitativa)" value={form.strength_notes} onChange={(v) => setForm({ ...form, strength_notes: v })} />
              <TextField label="Hallazgos" value={form.findings} onChange={(v) => setForm({ ...form, findings: v })} />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Objetivos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Objetivo específico 1" value={form.objectives.specific_1} onChange={(v) => setObjective("specific_1", v)} />
              <Field label="Objetivo específico 2" value={form.objectives.specific_2} onChange={(v) => setObjective("specific_2", v)} />
              <Field label="Objetivo específico 3" value={form.objectives.specific_3} onChange={(v) => setObjective("specific_3", v)} />
              <Field label="Objetivo general" value={form.objectives.general} onChange={(v) => setObjective("general", v)} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00d4ff] text-[#05050A] font-semibold text-sm hover:bg-[#00d4ff]/90 transition disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">Sin evaluaciones registradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-[10px] uppercase tracking-wider text-gray-500">
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-3">Fecha</th>
                <th className="text-right px-2">Peso</th>
                <th className="text-right px-2">% Grasa</th>
                <th className="text-right px-2">% Músculo</th>
                <th className="text-right px-2">Cintura</th>
                <th className="text-right px-2">Pecho</th>
                <th className="text-right px-2">Brazo</th>
                <th className="text-right px-2">Muslo</th>
                <th />
              </tr>
            </thead>
            <tbody className="font-inter text-white/90">
              {items.map((b) => (
                <>
                  <tr key={b.id} className="border-b border-white/[0.04]">
                    <td className="py-2 pr-3 tabular-nums">{b.measured_at}</td>
                    <td className="text-right px-2 tabular-nums">{b.weight_kg ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.body_fat_pct ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.muscle_mass_pct ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.waist_cm ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.chest_cm ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.arm_cm ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.thigh_cm ?? "—"}</td>
                    <td className="text-right pl-2 whitespace-nowrap">
                      {hasExtendedData(b) && (
                        <button
                          onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                          className="p-1 text-gray-500 hover:text-[#00d4ff] transition"
                          title="Ver ficha completa"
                        >
                          {expanded === b.id ? "▴" : "▾"}
                        </button>
                      )}
                      <button
                        onClick={() => remove(b.id)}
                        className="p-1 text-gray-500 hover:text-red-400 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  {expanded === b.id && (
                    <tr key={`${b.id}-detail`} className="border-b border-white/[0.04] bg-white/[0.02]">
                      <td colSpan={9} className="px-3 py-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-300">
                          {b.objectives?.general && <p><span className="text-gray-500">Objetivo general:</span> {b.objectives.general}</p>}
                          {b.findings && <p><span className="text-gray-500">Hallazgos:</span> {b.findings}</p>}
                          {b.rom_notes && <p><span className="text-gray-500">ROM:</span> {b.rom_notes}</p>}
                          {b.strength_notes && <p><span className="text-gray-500">Fuerza:</span> {b.strength_notes}</p>}
                          {b.pain_assessment?.location && <p><span className="text-gray-500">Dolor en:</span> {b.pain_assessment.location}</p>}
                          {b.habits?.physical_activity && <p><span className="text-gray-500">Actividad física:</span> {b.habits.physical_activity.level}</p>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function HabitField({
  label, level, count, onLevel, onCount, scale, countLabel = "N°",
}: {
  label: string;
  level: string;
  count?: string;
  onLevel: (v: string) => void;
  onCount?: (v: string) => void;
  scale: Array<[string, string]>;
  countLabel?: string;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</label>
        <select
          value={level}
          onChange={(e) => onLevel(e.target.value)}
          className="w-full bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[40px]"
        >
          {scale.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {onCount && (
        <div className="w-24">
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">{countLabel}</label>
          <input
            value={count ?? ""}
            onChange={(e) => onCount(e.target.value)}
            inputMode="decimal"
            className="w-full bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white tabular-nums"
          />
        </div>
      )}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
      />
    </div>
  );
}
```

(`StrengthSection` and the shared `Field` function below it are unchanged — leave them as-is.)

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: no errors referencing `EvaluationsPanel.tsx`.

- [ ] **Step 3: Manual smoke test in the preview**

Use `mcp__Claude_Preview__preview_start` (if not already running), open a patient's detail
modal → tab "Evaluaciones", click "Nueva evaluación", fill in at least one field per new
sub-section (a skinfold, a habit, the pain assessment, one objective), save, and confirm:
- The skinfold sum preview updates live as you type.
- The toast "Evaluación registrada" appears and the form collapses.
- The new row appears in the table with a "▾" toggle that reveals the extended detail
  (objective/findings/etc) when clicked.

- [ ] **Step 4: Commit**

```bash
git add client/components/dashboard/EvaluationsPanel.tsx
git commit -m "feat(evaluations): extend body evaluation form with skinfolds, vitals, habits, pain, objectives"
```

---

### Task 6: Add an objectives card to the student progress view

**Files:**
- Modify: `client/components/dashboard/sections/StudentDashboardSection.tsx:499-623`
  (`BodyEvaluationSection`)

- [ ] **Step 1: Add an "Objetivos vigentes" card after the growth-hotspot callout**

Replace (lines 608-619 — the closing of the `growthHotspot` block and the section's
closing `</div></section>`):

```typescript
          {growthHotspot && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
              <span className="text-emerald-100">
                Mayor crecimiento muscular en{" "}
                <span className="font-semibold">{growthHotspot.label.toLowerCase()}</span>:
                {" "}
                <span className="tabular-nums">+{growthHotspot.delta.toFixed(1)} cm</span> vs. medición previa
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
```

with:

```typescript
          {growthHotspot && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
              <span className="text-emerald-100">
                Mayor crecimiento muscular en{" "}
                <span className="font-semibold">{growthHotspot.label.toLowerCase()}</span>:
                {" "}
                <span className="tabular-nums">+{growthHotspot.delta.toFixed(1)} cm</span> vs. medición previa
              </span>
            </div>
          )}

          {latest.objectives && (latest.objectives.general || latest.objectives.specific_1) && (
            <div className="px-3 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                Objetivos vigentes (desde {latest.measured_at})
              </p>
              <ul className="space-y-1 text-xs text-white/90 list-disc pl-4">
                {[latest.objectives.specific_1, latest.objectives.specific_2, latest.objectives.specific_3]
                  .filter(Boolean)
                  .map((o, i) => <li key={i}>{o}</li>)}
              </ul>
              {latest.objectives.general && (
                <p className="text-xs text-gray-400 mt-2">
                  <span className="text-gray-500">General:</span> {latest.objectives.general}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm run typecheck`
Expected: no errors referencing `StudentDashboardSection.tsx`.

- [ ] **Step 3: Manual smoke test**

As the student role in the preview, open the dashboard and confirm the "Evaluación
corporal" section shows the "Objetivos vigentes" card when the most recent evaluation
has at least one objective filled in (use the row you created in Task 5, Step 3).

- [ ] **Step 4: Commit**

```bash
git add client/components/dashboard/sections/StudentDashboardSection.tsx
git commit -m "feat(student-dashboard): show current objectives on the body evaluation progress card"
```

---

### Task 7: Full regression pass

- [ ] **Step 1: Run the full test suite**

Run: `pnpm run test`
Expected: all tests pass, including the new `client/lib/evaluations.spec.ts`.

- [ ] **Step 2: Run the full typecheck**

Run: `pnpm run typecheck`
Expected: zero errors.

- [ ] **Step 3: Manual end-to-end check in the preview**

As admin: create a student via `PatientsList.tsx`, open their detail modal, fill the
reorganized `PatientForm.tsx` (confirm `socio_number`, `social_media_handle`,
`health_center`, `social_media_consent` all save and reload correctly, and confirm there
is no leftover "Composición corporal"/"Mediciones"/"Actividad y objetivos" section).
Then register an evaluation per Task 5 Step 3, and confirm the student-side dashboard
(Task 6) reflects it.

- [ ] **Step 4: Commit any fixes found during the regression pass, then stop here**

This plan's scope ends at the regression pass. Per the user's request, the next step
(outside this plan) is running `/design-critique` over the modified screens
(`PatientForm.tsx`, `EvaluationsPanel.tsx`, the student progress card) and, if it surfaces
usability issues, following up with `/frontend-design` to polish them.

---

## Plan self-review

**Spec coverage:** profile additions/removals (Task 3-4), body_evaluations additions
(Task 1, 3, 5), PatientForm regrouping (Task 4), EvaluationsPanel extension (Task 5),
progress view (Task 6) — all sections of the spec are covered. Sub-projects C/D remain
explicitly out of scope, as agreed.

**Type consistency check performed:** `Skinfolds`/`Habits`/`MaxHrZones`/`PainAssessment`/
`EvaluationObjectives` (Task 2) are the exact shapes consumed by `BodyEvaluation` (Task 3)
and by the form state in `EvaluationsPanel.tsx` (Task 5) — field names match
(`bicipital`/`tricipital`/.../`leg`, `smoking`/`alcohol`/`physical_activity`/`nutrition`/
`hydration`/`rest`, `pct50`..`pct100`, `onset`/`location`/`radiation`/`character`/
`intensity_0_10`/`aggravating`, `specific_1`/`specific_2`/`specific_3`/`general`)
throughout.

---

# Addendum — Ronda 2: feedback de revisión (2026-06-21)

> Spec actualizado: ver el addendum en
> `docs/superpowers/specs/2026-06-20-perfil-evaluacion-mensual-design.md`. Tareas 8-13
> abajo. Mismo proceso: subagente implementador → revisor de spec → revisor de calidad,
> por tarea, en el mismo worktree/rama `worktree-perfil-evaluacion-mensual`.

**Contexto verificado antes de escribir este addendum:** Supabase `lvxktbecpvmbcuucjxpp`,
tabla `profiles`: 6 filas totales, 1 con `emergency_contact_name` no vacío (hay que migrar
ese dato antes de borrar las columnas viejas, a diferencia de la migración 024 que no tenía
ningún dato real que preservar).

### Task 8: Migración 025 — dirección separada, contactos de emergencia múltiples, "otra" enfermedad, secuencia de socio

**Files:**
- Create: `migrations/025_profile_fields_v2.sql`

- [ ] **Step 1: Escribir la migración**

```sql
-- ============================================================
-- Migration 025: Profile fields v2 (post-review feedback)
-- ============================================================
-- Continuación de la migración 024 tras feedback de revisión del usuario
-- sobre el worktree. Ver docs/superpowers/specs/2026-06-20-perfil-evaluacion-mensual-design.md
-- (sección "Addendum 2026-06-21") para el detalle completo.
-- ============================================================

-- ---------- profiles: dirección separada en 3 campos ----------
-- `address` sigue siendo la calle (sin cambio de nombre ni de tipo).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS comuna text;

-- ---------- profiles: "otra" enfermedad como texto libre ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diseases_other text;

-- ---------- profiles: contacto de emergencia → array ----------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS emergency_contacts jsonb;

-- Backfill: la única fila real con emergency_contact_name no vacío pasa a
-- emergency_contacts antes de eliminar las columnas viejas. Verificado en vivo
-- (2026-06-21): 1 de 6 filas en profiles cumple la condición.
UPDATE public.profiles
SET emergency_contacts = jsonb_build_array(
  jsonb_build_object(
    'name', emergency_contact_name,
    'phone', emergency_contact_phone,
    'relation', emergency_contact_relation
  )
)
WHERE emergency_contact_name IS NOT NULL AND emergency_contact_name <> '';

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS emergency_contact_name,
  DROP COLUMN IF EXISTS emergency_contact_phone,
  DROP COLUMN IF EXISTS emergency_contact_relation;

-- ---------- socio_number: secuencia + función autogeneradora ----------
-- Solo se usa server-side (admin-create-patient.ts) para role='student'.
-- Formato: HTKTOP-001, HTKTOP-002, ... Los alumnos migrados del centro
-- anterior usan el prefijo HTK- — esa reasignación puntual se hace
-- manualmente más adelante, fuera de esta función.
CREATE SEQUENCE IF NOT EXISTS public.socio_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.next_socio_number()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'HTKTOP-' || lpad(nextval('public.socio_number_seq')::text, 3, '0');
$$;

GRANT EXECUTE ON FUNCTION public.next_socio_number() TO service_role;

-- ---------- Audit verification ----------
-- Run after applying:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'profiles'
--     AND column_name IN ('address_number','comuna','diseases_other','emergency_contacts');
--   -- expect 4 rows
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'profiles'
--     AND column_name IN ('emergency_contact_name','emergency_contact_phone','emergency_contact_relation');
--   -- expect 0 rows
--
--   SELECT emergency_contacts FROM profiles WHERE emergency_contacts IS NOT NULL;
--   -- expect exactly 1 row, with the migrated contact's name/phone/relation
--
--   SELECT public.next_socio_number();
--   -- expect 'HTKTOP-001' on first call in a fresh sequence (or the next
--   -- number in sequence if called before)
```

- [ ] **Step 2: Aplicar la migración** vía `mcp__plugin_supabase_supabase__apply_migration`
  con `project_id: "lvxktbecpvmbcuucjxpp"`, `name: "profile_fields_v2"`.

- [ ] **Step 3: Verificar** con las 4 queries de auditoría del comentario SQL.

- [ ] **Step 4: Commit**

```bash
git add migrations/025_profile_fields_v2.sql
git commit -m "feat(db): split address fields, multi-contact emergency contacts, diseases_other, socio_number sequence"
```

---

### Task 9: Tipos en `client/services/supabase.ts` — v2

**Files:**
- Modify: `client/services/supabase.ts` (interfaz `PatientProfile`, `PATIENT_FIELDS`, nuevo tipo `EmergencyContact`)

- [ ] **Step 1: Agregar el tipo `EmergencyContact`**

Justo antes de `export interface PatientProfile {` agregar:

```typescript
export interface EmergencyContact {
  name: string;
  phone?: string;
  relation?: string;
}
```

- [ ] **Step 2: Actualizar `PatientProfile`**

Quitar `emergency_contact_name?: string;`, `emergency_contact_phone?: string;`,
`emergency_contact_relation?: string;`. Agregar en su lugar (mismo orden, donde estaban):

```typescript
  emergency_contacts?: EmergencyContact[];
```

Agregar también (junto a `address`):

```typescript
  address_number?: string;
  comuna?: string;
```

Agregar junto a `diseases`:

```typescript
  diseases_other?: string;
```

- [ ] **Step 3: Actualizar `PATIENT_FIELDS`**

Reemplazar `emergency_contact_name, emergency_contact_phone, emergency_contact_relation,`
por `emergency_contacts,`. Agregar `address_number, comuna,` junto a `address`. Agregar
`diseases_other,` junto a `diseases`.

- [ ] **Step 4: Typecheck**

`npm run typecheck` (con el PATH de node v22) — no debe haber errores nuevos en
`supabase.ts`. Es esperable que `PatientForm.tsx` quede con errores temporales hasta la
Task 12.

- [ ] **Step 5: Commit**

```bash
git add client/services/supabase.ts
git commit -m "refactor(types): split address, multi-contact emergency_contacts, diseases_other"
```

---

### Task 10: `socio_number` autogenerado en `netlify/functions/admin-create-patient.ts`

**Files:**
- Modify: `netlify/functions/admin-create-patient.ts`

- [ ] **Step 1: Generar el número solo para alumnos**

Justo antes del bloque `// Upsert profile (trigger may have already created it...)`,
agregar:

```typescript
    // socio_number autogenerado solo para alumnos (no profesores). Formato
    // HTKTOP-001, HTKTOP-002... vía secuencia Postgres. Los alumnos migrados
    // del centro anterior se reasignan manualmente al prefijo HTK- después,
    // fuera de este flujo.
    let socioNumber: string | null = null;
    if (role === "student") {
      const { data: socioData, error: socioErr } = await sb.rpc("next_socio_number");
      if (socioErr) {
        console.error("admin-create-patient: next_socio_number failed", socioErr);
      } else {
        socioNumber = socioData as string;
      }
    }
```

- [ ] **Step 2: Incluirlo en el upsert**

Reemplazar:

```typescript
    // Upsert profile (trigger may have already created it; we ensure all fields)
    await sb.from("profiles").upsert(
      {
        id: userId,
        full_name,
        email,
        phone: phone || null,
        rut_dni: rut_dni || null,
        role,
        is_admin: false,
      },
      { onConflict: "id" }
    );
```

con:

```typescript
    // Upsert profile (trigger may have already created it; we ensure all fields)
    await sb.from("profiles").upsert(
      {
        id: userId,
        full_name,
        email,
        phone: phone || null,
        rut_dni: rut_dni || null,
        role,
        is_admin: false,
        ...(socioNumber ? { socio_number: socioNumber } : {}),
      },
      { onConflict: "id" }
    );
```

- [ ] **Step 3: Typecheck**

`npm run typecheck` — sin errores nuevos en este archivo.

- [ ] **Step 4: Commit**

```bash
git add netlify/functions/admin-create-patient.ts
git commit -m "feat(admin): auto-generate socio_number for new students via next_socio_number()"
```

---

### Task 11: Extraer `client/components/dashboard/BodyEvaluationFields.tsx` (refactor, sin cambio de comportamiento)

**Files:**
- Create: `client/components/dashboard/BodyEvaluationFields.tsx`
- Modify: `client/components/dashboard/EvaluationsPanel.tsx`

- [ ] **Step 1: Crear el módulo compartido**

```typescript
// client/components/dashboard/BodyEvaluationFields.tsx
import {
  HABIT_LEVEL_OPTIONS,
  QUALITY_LEVEL_OPTIONS,
  computeSkinfoldSum,
  computeHrZones,
  type Skinfolds,
  type Habits,
  type PainAssessment,
  type EvaluationObjectives,
} from "@/lib/evaluations";

const todayIso = () => new Date().toISOString().slice(0, 10);

export const EMPTY_BODY_EVAL_FORM = {
  measured_at: todayIso(),
  height_cm: "", weight_kg: "", body_fat_pct: "", muscle_mass_pct: "", bone_mass_pct: "",
  waist_cm: "", hip_cm: "", chest_cm: "", arm_cm: "", thigh_cm: "", calf_cm: "",
  neck_cm: "", shoulders_cm: "",
  skinfolds: { bicipital: "", tricipital: "", subescapular: "", abdominal: "", suprailiaco: "", thigh: "", leg: "" },
  resting_heart_rate: "", blood_pressure_systolic: "", blood_pressure_diastolic: "", max_heart_rate: "",
  habits: {
    smoking: { level: "no" as const, count: "" },
    alcohol: { level: "no" as const, count: "" },
    physical_activity: { level: "no" as const, count: "" },
    nutrition: { level: "regular" as const },
    hydration: { level: "regular" as const },
    rest: { level: "regular" as const, hours: "" },
  },
  pain_assessment: { onset: "", location: "", radiation: "", character: "", intensity_0_10: "", aggravating: "" },
  rom_notes: "", strength_notes: "", findings: "",
  objectives: { specific_1: "", specific_2: "", specific_3: "", general: "" },
  notes: "",
};

export type BodyEvalFormState = typeof EMPTY_BODY_EVAL_FORM;

const num = (v: string) => (v.trim() === "" ? null : Number(v));

/** True when every field (except measured_at) is still at its EMPTY_BODY_EVAL_FORM default. */
export function isBodyEvalFormEmpty(form: BodyEvalFormState): boolean {
  const { measured_at, ...rest } = form;
  const { measured_at: _unused, ...emptyRest } = EMPTY_BODY_EVAL_FORM;
  return JSON.stringify(rest) === JSON.stringify(emptyRest);
}

/** Builds the body_evaluations payload fields (everything except patient_id/professional_id) from form state. */
export function buildBodyEvaluationPayload(form: BodyEvalFormState) {
  const skinfolds: Skinfolds = {
    bicipital: num(form.skinfolds.bicipital) ?? undefined,
    tricipital: num(form.skinfolds.tricipital) ?? undefined,
    subescapular: num(form.skinfolds.subescapular) ?? undefined,
    abdominal: num(form.skinfolds.abdominal) ?? undefined,
    suprailiaco: num(form.skinfolds.suprailiaco) ?? undefined,
    thigh: num(form.skinfolds.thigh) ?? undefined,
    leg: num(form.skinfolds.leg) ?? undefined,
  };
  const hasSkinfolds = Object.values(skinfolds).some((v) => v != null);

  const habits: Habits = {
    smoking: { level: form.habits.smoking.level, count: num(form.habits.smoking.count) ?? undefined },
    alcohol: { level: form.habits.alcohol.level, count: num(form.habits.alcohol.count) ?? undefined },
    physical_activity: { level: form.habits.physical_activity.level, count: num(form.habits.physical_activity.count) ?? undefined },
    nutrition: { level: form.habits.nutrition.level },
    hydration: { level: form.habits.hydration.level },
    rest: { level: form.habits.rest.level, hours: num(form.habits.rest.hours) ?? undefined },
  };
  const hasHabits = !(
    form.habits.smoking.level === "no" && !form.habits.smoking.count &&
    form.habits.alcohol.level === "no" && !form.habits.alcohol.count &&
    form.habits.physical_activity.level === "no" && !form.habits.physical_activity.count &&
    form.habits.nutrition.level === "regular" &&
    form.habits.hydration.level === "regular" &&
    form.habits.rest.level === "regular" && !form.habits.rest.hours
  );

  const painAssessment: PainAssessment = {
    onset: form.pain_assessment.onset.trim() || undefined,
    location: form.pain_assessment.location.trim() || undefined,
    radiation: form.pain_assessment.radiation.trim() || undefined,
    character: form.pain_assessment.character.trim() || undefined,
    intensity_0_10: num(form.pain_assessment.intensity_0_10) ?? undefined,
    aggravating: form.pain_assessment.aggravating.trim() || undefined,
  };
  const hasPainAssessment = Object.values(painAssessment).some((v) => v != null);

  const objectives: EvaluationObjectives = {
    specific_1: form.objectives.specific_1.trim() || undefined,
    specific_2: form.objectives.specific_2.trim() || undefined,
    specific_3: form.objectives.specific_3.trim() || undefined,
    general: form.objectives.general.trim() || undefined,
  };
  const hasObjectives = Object.values(objectives).some((v) => v != null);

  return {
    measured_at: form.measured_at,
    height_cm: num(form.height_cm),
    weight_kg: num(form.weight_kg),
    body_fat_pct: num(form.body_fat_pct),
    muscle_mass_pct: num(form.muscle_mass_pct),
    bone_mass_pct: num(form.bone_mass_pct),
    waist_cm: num(form.waist_cm),
    hip_cm: num(form.hip_cm),
    chest_cm: num(form.chest_cm),
    arm_cm: num(form.arm_cm),
    thigh_cm: num(form.thigh_cm),
    calf_cm: num(form.calf_cm),
    neck_cm: num(form.neck_cm),
    shoulders_cm: num(form.shoulders_cm),
    skinfolds: hasSkinfolds ? skinfolds : null,
    resting_heart_rate: num(form.resting_heart_rate),
    blood_pressure_systolic: num(form.blood_pressure_systolic),
    blood_pressure_diastolic: num(form.blood_pressure_diastolic),
    max_hr_zones: computeHrZones(num(form.max_heart_rate)),
    habits: hasHabits ? habits : null,
    pain_assessment: hasPainAssessment ? painAssessment : null,
    rom_notes: form.rom_notes.trim() || null,
    strength_notes: form.strength_notes.trim() || null,
    findings: form.findings.trim() || null,
    objectives: hasObjectives ? objectives : null,
    notes: form.notes.trim() || null,
  };
}

export function BodyEvaluationFormFields({
  form, onChange,
}: {
  form: BodyEvalFormState;
  onChange: (updater: (f: BodyEvalFormState) => BodyEvalFormState) => void;
}) {
  const setForm = (patch: Partial<BodyEvalFormState>) => onChange((f) => ({ ...f, ...patch }));

  const setSkinfold = (key: keyof BodyEvalFormState["skinfolds"], v: string) =>
    onChange((f) => ({ ...f, skinfolds: { ...f.skinfolds, [key]: v } }));

  const setHabitLevel = (key: keyof BodyEvalFormState["habits"], level: string) =>
    onChange((f) => ({ ...f, habits: { ...f.habits, [key]: { ...(f.habits as any)[key], level } } }));

  const setHabitField = (key: keyof BodyEvalFormState["habits"], field: string, v: string) =>
    onChange((f) => ({ ...f, habits: { ...f.habits, [key]: { ...(f.habits as any)[key], [field]: v } } }));

  const setPain = (key: keyof BodyEvalFormState["pain_assessment"], v: string) =>
    onChange((f) => ({ ...f, pain_assessment: { ...f.pain_assessment, [key]: v } }));

  const setObjective = (key: keyof BodyEvalFormState["objectives"], v: string) =>
    onChange((f) => ({ ...f, objectives: { ...f.objectives, [key]: v } }));

  const num2 = (v: string) => (v.trim() === "" ? null : Number(v));
  const skinfoldSumPreview = computeSkinfoldSum({
    bicipital: num2(form.skinfolds.bicipital) ?? undefined,
    tricipital: num2(form.skinfolds.tricipital) ?? undefined,
    subescapular: num2(form.skinfolds.subescapular) ?? undefined,
    abdominal: num2(form.skinfolds.abdominal) ?? undefined,
    suprailiaco: num2(form.skinfolds.suprailiaco) ?? undefined,
    thigh: num2(form.skinfolds.thigh) ?? undefined,
    leg: num2(form.skinfolds.leg) ?? undefined,
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Antropometría</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Fecha" type="date" value={form.measured_at}
            onChange={(v) => setForm({ measured_at: v })} />
          <Field label="Estatura (cm)" value={form.height_cm} onChange={(v) => setForm({ height_cm: v })} />
          <Field label="Peso (kg)" value={form.weight_kg} onChange={(v) => setForm({ weight_kg: v })} />
          <Field label="% Grasa" value={form.body_fat_pct} onChange={(v) => setForm({ body_fat_pct: v })} />
          <Field label="% Músculo" value={form.muscle_mass_pct} onChange={(v) => setForm({ muscle_mass_pct: v })} />
          <Field label="% Hueso" value={form.bone_mass_pct} onChange={(v) => setForm({ bone_mass_pct: v })} />
          <Field label="Cuello (cm)" value={form.neck_cm} onChange={(v) => setForm({ neck_cm: v })} />
          <Field label="Hombros (cm)" value={form.shoulders_cm} onChange={(v) => setForm({ shoulders_cm: v })} />
          <Field label="Cintura (cm)" value={form.waist_cm} onChange={(v) => setForm({ waist_cm: v })} />
          <Field label="Cadera (cm)" value={form.hip_cm} onChange={(v) => setForm({ hip_cm: v })} />
          <Field label="Pecho (cm)" value={form.chest_cm} onChange={(v) => setForm({ chest_cm: v })} />
          <Field label="Brazo (cm)" value={form.arm_cm} onChange={(v) => setForm({ arm_cm: v })} />
          <Field label="Muslo (cm)" value={form.thigh_cm} onChange={(v) => setForm({ thigh_cm: v })} />
          <Field label="Pantorrilla (cm)" value={form.calf_cm} onChange={(v) => setForm({ calf_cm: v })} />
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase mb-2">
          Pliegues cutáneos (mm){skinfoldSumPreview != null && (
            <span className="text-[#00d4ff] ml-2 normal-case">Sumatoria: {skinfoldSumPreview} mm</span>
          )}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Bicipital" value={form.skinfolds.bicipital} onChange={(v) => setSkinfold("bicipital", v)} />
          <Field label="Tricipital" value={form.skinfolds.tricipital} onChange={(v) => setSkinfold("tricipital", v)} />
          <Field label="Subescapular" value={form.skinfolds.subescapular} onChange={(v) => setSkinfold("subescapular", v)} />
          <Field label="Abdominal" value={form.skinfolds.abdominal} onChange={(v) => setSkinfold("abdominal", v)} />
          <Field label="Suprailiaco" value={form.skinfolds.suprailiaco} onChange={(v) => setSkinfold("suprailiaco", v)} />
          <Field label="Muslo" value={form.skinfolds.thigh} onChange={(v) => setSkinfold("thigh", v)} />
          <Field label="Pierna" value={form.skinfolds.leg} onChange={(v) => setSkinfold("leg", v)} />
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Signos vitales</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="FC reposo (bpm)" value={form.resting_heart_rate} onChange={(v) => setForm({ resting_heart_rate: v })} />
          <Field label="Presión sistólica" value={form.blood_pressure_systolic} onChange={(v) => setForm({ blood_pressure_systolic: v })} />
          <Field label="Presión diastólica" value={form.blood_pressure_diastolic} onChange={(v) => setForm({ blood_pressure_diastolic: v })} />
          <Field label="FC máxima (para zonas)" value={form.max_heart_rate} onChange={(v) => setForm({ max_heart_rate: v })} />
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Hábitos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <HabitField label="Tabaquismo" level={form.habits.smoking.level} count={form.habits.smoking.count}
            onLevel={(v) => setHabitLevel("smoking", v)} onCount={(v) => setHabitField("smoking", "count", v)} scale={HABIT_LEVEL_OPTIONS} />
          <HabitField label="Alcohol" level={form.habits.alcohol.level} count={form.habits.alcohol.count}
            onLevel={(v) => setHabitLevel("alcohol", v)} onCount={(v) => setHabitField("alcohol", "count", v)} scale={HABIT_LEVEL_OPTIONS} />
          <HabitField label="Actividad física" level={form.habits.physical_activity.level} count={form.habits.physical_activity.count}
            onLevel={(v) => setHabitLevel("physical_activity", v)} onCount={(v) => setHabitField("physical_activity", "count", v)} scale={HABIT_LEVEL_OPTIONS} countLabel="x/semana" />
          <HabitField label="Alimentación" level={form.habits.nutrition.level}
            onLevel={(v) => setHabitLevel("nutrition", v)} scale={QUALITY_LEVEL_OPTIONS} />
          <HabitField label="Hidratación" level={form.habits.hydration.level}
            onLevel={(v) => setHabitLevel("hydration", v)} scale={QUALITY_LEVEL_OPTIONS} />
          <HabitField label="Descanso" level={form.habits.rest.level} count={form.habits.rest.hours}
            onLevel={(v) => setHabitLevel("rest", v)} onCount={(v) => setHabitField("rest", "hours", v)} scale={QUALITY_LEVEL_OPTIONS} countLabel="hrs/noche" />
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Evaluación del dolor (si aplica)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field label="Aparición" value={form.pain_assessment.onset} onChange={(v) => setPain("onset", v)} />
          <Field label="Localización" value={form.pain_assessment.location} onChange={(v) => setPain("location", v)} />
          <Field label="Irradiación" value={form.pain_assessment.radiation} onChange={(v) => setPain("radiation", v)} />
          <Field label="Carácter" value={form.pain_assessment.character} onChange={(v) => setPain("character", v)} />
          <Field label="Intensidad (0-10)" value={form.pain_assessment.intensity_0_10} onChange={(v) => setPain("intensity_0_10", v)} />
          <Field label="Agravantes" value={form.pain_assessment.aggravating} onChange={(v) => setPain("aggravating", v)} />
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Evaluación kinésica</p>
        <div className="space-y-2">
          <TextField label="ROM (rango de movimiento)" value={form.rom_notes} onChange={(v) => setForm({ rom_notes: v })} />
          <TextField label="Fuerza (observación cualitativa)" value={form.strength_notes} onChange={(v) => setForm({ strength_notes: v })} />
          <TextField label="Hallazgos" value={form.findings} onChange={(v) => setForm({ findings: v })} />
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Objetivos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Objetivo específico 1" value={form.objectives.specific_1} onChange={(v) => setObjective("specific_1", v)} />
          <Field label="Objetivo específico 2" value={form.objectives.specific_2} onChange={(v) => setObjective("specific_2", v)} />
          <Field label="Objetivo específico 3" value={form.objectives.specific_3} onChange={(v) => setObjective("specific_3", v)} />
          <Field label="Objetivo general" value={form.objectives.general} onChange={(v) => setObjective("general", v)} />
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Notas</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ notes: e.target.value })}
          rows={2}
          className="w-full bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
        />
      </div>
    </div>
  );
}

export function HabitField({
  label, level, count, onLevel, onCount, scale, countLabel = "N°",
}: {
  label: string;
  level: string;
  count?: string;
  onLevel: (v: string) => void;
  onCount?: (v: string) => void;
  scale: Array<[string, string]>;
  countLabel?: string;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</label>
        <select
          value={level}
          onChange={(e) => onLevel(e.target.value)}
          className="w-full bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[40px]"
        >
          {scale.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {onCount && (
        <div className="w-24">
          <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">{countLabel}</label>
          <input
            value={count ?? ""}
            onChange={(e) => onCount(e.target.value)}
            inputMode="decimal"
            className="w-full bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white tabular-nums"
          />
        </div>
      )}
    </div>
  );
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
      />
    </div>
  );
}

export function Field({
  label, value, onChange, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        inputMode={type === "text" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[40px] tabular-nums"
      />
    </div>
  );
}
```

- [ ] **Step 2: Refactorizar `EvaluationsPanel.tsx` para usar el módulo compartido**

Reemplazar el bloque de imports + `EMPTY_BODY_FORM` (líneas 1-101 del archivo actual) por:

```typescript
import { Fragment, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Activity, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  listBodyEvaluations,
  createBodyEvaluation,
  deleteBodyEvaluation,
  listStrengthEvaluations,
  createStrengthEvaluation,
  deleteStrengthEvaluation,
  STRENGTH_EXERCISES,
  type BodyEvaluation,
  type StrengthEvaluation,
  type StrengthExerciseKey,
} from "@/services/supabase";
import {
  EMPTY_BODY_EVAL_FORM,
  buildBodyEvaluationPayload,
  BodyEvaluationFormFields,
  Field,
  type BodyEvalFormState,
} from "./BodyEvaluationFields";

interface Props {
  patientId: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);
```

(Everything from `export default function EvaluationsPanel` down to the `StrengthSection`
comment stays — only the `// Body composition + extended monthly assessment` block changes.)

Replace the whole `// Body composition + extended monthly assessment` block (from
`const EMPTY_BODY_FORM = {` through the end of the `BodySection` function, i.e. up to but
NOT including `function HabitField(...)`/`function TextField(...)`/the trailing `function
Field(...)` — those three get DELETED entirely, they now live in `BodyEvaluationFields.tsx`)
with:

```typescript
// =============================================================
// Body composition + extended monthly assessment
// =============================================================
function BodySection({
  items, patientId, professionalId, onChanged,
}: {
  items: BodyEvaluation[];
  patientId: string;
  professionalId: string | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BodyEvalFormState>(EMPTY_BODY_EVAL_FORM);
  const [expanded, setExpanded] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    const r = await createBodyEvaluation({
      patient_id: patientId,
      professional_id: professionalId,
      ...buildBodyEvaluationPayload(form),
    });
    setSaving(false);
    if (r.success) {
      toast.success("Evaluación registrada");
      setForm(EMPTY_BODY_EVAL_FORM);
      setOpen(false);
      onChanged();
    } else {
      toast.error(`Error: ${r.error}`);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta evaluación?")) return;
    const r = await deleteBodyEvaluation(id);
    if (r.success) { toast.success("Eliminada"); onChanged(); }
    else toast.error(`Error: ${r.error}`);
  };

  const hasExtendedData = (b: BodyEvaluation) =>
    !!(
      b.skinfolds || b.habits || b.pain_assessment || b.objectives ||
      b.rom_notes || b.strength_notes || b.findings ||
      b.resting_heart_rate != null || b.blood_pressure_systolic != null ||
      b.blood_pressure_diastolic != null || b.max_hr_zones || b.neck_cm != null ||
      b.shoulders_cm != null
    );

  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-white font-semibold font-lexend text-sm">Evaluación mensual</h3>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff]/15 text-[#00d4ff] text-xs font-semibold hover:bg-[#00d4ff]/25 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          {open ? "Cancelar" : "Nueva evaluación"}
        </button>
      </header>

      {open && (
        <div className="bg-[#0f131a] border border-white/10 rounded-xl p-4 mb-4 space-y-5">
          <BodyEvaluationFormFields form={form} onChange={setForm} />
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00d4ff] text-[#05050A] font-semibold text-sm hover:bg-[#00d4ff]/90 transition disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">Sin evaluaciones registradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-[10px] uppercase tracking-wider text-gray-500">
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-3">Fecha</th>
                <th className="text-right px-2">Peso</th>
                <th className="text-right px-2">% Grasa</th>
                <th className="text-right px-2">% Músculo</th>
                <th className="text-right px-2">Cintura</th>
                <th className="text-right px-2">Pecho</th>
                <th className="text-right px-2">Brazo</th>
                <th className="text-right px-2">Muslo</th>
                <th />
              </tr>
            </thead>
            <tbody className="font-inter text-white/90">
              {items.map((b) => (
                <Fragment key={b.id}>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2 pr-3 tabular-nums">{b.measured_at}</td>
                    <td className="text-right px-2 tabular-nums">{b.weight_kg ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.body_fat_pct ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.muscle_mass_pct ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.waist_cm ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.chest_cm ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.arm_cm ?? "—"}</td>
                    <td className="text-right px-2 tabular-nums">{b.thigh_cm ?? "—"}</td>
                    <td className="text-right pl-2 whitespace-nowrap">
                      {hasExtendedData(b) && (
                        <button
                          onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                          className="p-1 text-gray-500 hover:text-[#00d4ff] transition"
                          title="Ver ficha completa"
                        >
                          {expanded === b.id ? "▴" : "▾"}
                        </button>
                      )}
                      <button
                        onClick={() => remove(b.id)}
                        className="p-1 text-gray-500 hover:text-red-400 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  {expanded === b.id && (
                    <tr className="border-b border-white/[0.04] bg-white/[0.02]">
                      <td colSpan={9} className="px-3 py-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-300">
                          {b.objectives?.general && <p><span className="text-gray-500">Objetivo general:</span> {b.objectives.general}</p>}
                          {b.findings && <p><span className="text-gray-500">Hallazgos:</span> {b.findings}</p>}
                          {b.rom_notes && <p><span className="text-gray-500">ROM:</span> {b.rom_notes}</p>}
                          {b.strength_notes && <p><span className="text-gray-500">Fuerza:</span> {b.strength_notes}</p>}
                          {b.pain_assessment?.location && <p><span className="text-gray-500">Dolor en:</span> {b.pain_assessment.location}</p>}
                          {b.habits?.physical_activity && <p><span className="text-gray-500">Actividad física:</span> {b.habits.physical_activity.level}</p>}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
```

`StrengthSection` (uses the `Field` now imported from `./BodyEvaluationFields` instead of
the locally-defined one) keeps its current code unchanged — just delete the trailing
`function Field(...)` definition at the very end of the file (it's now imported).

- [ ] **Step 3: Typecheck**

`npm run typecheck` — sin errores nuevos en `EvaluationsPanel.tsx` ni en
`BodyEvaluationFields.tsx`.

- [ ] **Step 4: Verificación de comportamiento (no debe cambiar nada visible)**

Leer el archivo final y confirmar que el JSX renderizado es idéntico al de antes del
refactor — este paso es un refactor puro, cero cambio de comportamiento. Si hay cualquier
diferencia de estilos/clases/textos respecto al archivo previo a este Task, es un bug
introducido por el refactor, no algo a "mejorar de paso".

- [ ] **Step 5: Commit**

```bash
git add client/components/dashboard/BodyEvaluationFields.tsx client/components/dashboard/EvaluationsPanel.tsx
git commit -m "refactor(evaluations): extract shared BodyEvaluationFields module from EvaluationsPanel"
```

---

### Task 12: `PatientForm.tsx` — fixes de UI, campos nuevos, sección "Evaluación inicial (opcional)"

**Files:**
- Modify: `client/components/dashboard/PatientForm.tsx`

Este task depende de Task 9 (tipos) y Task 11 (módulo compartido) — deben estar
mergeados/commiteados en la rama antes de empezar.

- [ ] **Step 1: Imports**

Agregar a los imports existentes:

```typescript
import { Copy } from "lucide-react"; // junto a los demás iconos de lucide-react ya importados
import { useAuth } from "@/contexts/AuthContext";
import {
  // ...los imports existentes de @/services/supabase, más:
  createBodyEvaluation,
  type EmergencyContact,
} from "@/services/supabase";
import {
  EMPTY_BODY_EVAL_FORM,
  buildBodyEvaluationPayload,
  isBodyEvalFormEmpty,
  BodyEvaluationFormFields,
  type BodyEvalFormState,
} from "./BodyEvaluationFields";
```

Agregar, junto a `const PARQ_QUESTIONS = [...]`:

```typescript
const todayIso = () => new Date().toISOString().slice(0, 10);
// TODO: reemplazar con la URL real del documento de tratamiento de datos
// personales cuando el usuario la entregue.
const DATA_CONSENT_DOCUMENT_URL = "#";
```

- [ ] **Step 2: `EMPTY` — quitar los 3 campos viejos de contacto de emergencia, agregar los nuevos**

Quitar `emergency_contact_name: ""`, `emergency_contact_phone: ""`,
`emergency_contact_relation: ""`. Agregar en su lugar `emergency_contacts: []`. Agregar
también `address_number: ""`, `comuna: ""`, `diseases_other: ""`.

- [ ] **Step 3: `SectionId` — agregar `"evaluation"`**

```typescript
type SectionId =
  | "photo" | "personal" | "contact" | "professional" | "evaluation" | "parq" | "medical"
  | "conditions" | "sports" | "substances" | "emergency" | "extra" | "admin";
```

Y en el `useState<Record<SectionId, boolean>>({...})` agregar `evaluation: false,`.

- [ ] **Step 4: Nuevo estado para la evaluación inicial + `useAuth`**

Dentro del componente, junto a los demás `useState`:

```typescript
  const { user } = useAuth();
  const [evalForm, setEvalForm] = useState<BodyEvalFormState>(EMPTY_BODY_EVAL_FORM);
```

- [ ] **Step 5: Generalizar `addRow`/`removeRow`/`updateRow` para incluir `emergency_contacts`**

Reemplazar la unión de tipos `"sports" | "drugs" | "medications"` por
`"sports" | "drugs" | "medications" | "emergency_contacts"` en las firmas de `addRow`,
`removeRow`, `updateRow` (sin otro cambio en sus cuerpos).

- [ ] **Step 6: `handleSave` — guardar también la evaluación inicial si se llenó algo**

Dentro del bloque `if (res.success) { toast.success("Paciente actualizado"); ... }`,
después del comentario sobre `onSaved`, ANTES del `try { await onSaved(); } ...`:

```typescript
        if (!isBodyEvalFormEmpty(evalForm)) {
          const evalRes = await createBodyEvaluation({
            patient_id: patientId,
            professional_id: user?.id ?? null,
            ...buildBodyEvaluationPayload(evalForm),
          });
          if (evalRes.success) {
            toast.success("Evaluación inicial registrada");
            setEvalForm(EMPTY_BODY_EVAL_FORM);
          } else {
            toast.error(`La evaluación inicial no se pudo guardar: ${evalRes.error}`);
          }
        }
```

- [ ] **Step 7: Sección "Datos personales" — Edad, Fecha de ingreso, N° de socio, fix "Hijos"**

Reemplazar el contenido de la sección `id="personal"` (Grid completo) con:

```typescript
        <Grid>
          <Field label="Nombre completo *"><Input value={form.full_name || ""} onChange={(v) => set("full_name", v)} /></Field>
          <Field label="RUT / DNI">
            <Input
              value={form.rut_dni || ""}
              onChange={(v) => { set("rut_dni", v); setRutTouched(true); }}
              onBlur={() => {
                if (form.rut_dni && isValidRut(form.rut_dni)) {
                  set("rut_dni", formatRut(form.rut_dni));
                }
              }}
              placeholder="12.345.678-9"
            />
            {rutTouched && form.rut_dni && !rutValid && (
              <p className="text-[10px] text-red-400 mt-1">RUT inválido (verifica formato y dígito)</p>
            )}
            {rutTouched && form.rut_dni && rutValid && (
              <p className="text-[10px] text-emerald-400 mt-1">RUT válido ✓</p>
            )}
          </Field>
          <Field label="N° de socio">
            <div className="flex items-center gap-2">
              <Input value={form.socio_number || "—"} disabled className="flex-1" />
              {form.socio_number && (
                <button type="button"
                  onClick={() => { navigator.clipboard.writeText(form.socio_number || ""); toast.success("Copiado"); }}
                  className="p-2 rounded-lg bg-white/[0.05] border border-white/10 text-gray-400 hover:text-white transition shrink-0"
                  title="Copiar">
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>
          </Field>
          <Field label="Fecha de nacimiento">
            <Input type="date" value={form.birth_date || ""} onChange={(v) => set("birth_date", v)} />
          </Field>
          <Field label="Edad">
            <Input value={age != null ? `${age} años` : "—"} disabled />
          </Field>
          <Field label="Fecha de ingreso">
            <Input type="date" value={(form.joined_at || "").slice(0, 10) || todayIso()} onChange={(v) => set("joined_at", v)} />
          </Field>
          <Field label="Género">
            <Select value={form.gender || ""} onChange={(v) => set("gender", v)}
              options={[["", "—"], ["M", "Masculino"], ["F", "Femenino"], ["X", "Otro / Prefiere no decir"]]} />
          </Field>
          <Field label="Estado civil">
            <Select value={form.marital_status || ""} onChange={(v) => set("marital_status", v as any)}
              options={[["", "—"], ["soltero", "Soltero/a"], ["casado", "Casado/a"], ["conviviente", "Conviviente"], ["divorciado", "Divorciado/a"], ["viudo", "Viudo/a"], ["otro", "Otro"]]} />
          </Field>
          <Field label="Hijos">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-white whitespace-nowrap">
                <input type="checkbox" checked={!!form.has_children}
                  onChange={(e) => set("has_children", e.target.checked)} />
                Sí
              </label>
              {form.has_children && (
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Número de hijos</label>
                  <Input type="number" value={String(form.num_children ?? 0)}
                    onChange={(v) => set("num_children", parseInt(v) || 0)} />
                </div>
              )}
            </div>
          </Field>
          <Field label="Lateralidad">
            <Select value={form.handedness || ""} onChange={(v) => set("handedness", v as any)}
              options={[["", "—"], ["diestro", "Diestro"], ["zurdo", "Zurdo"], ["ambidiestro", "Ambidiestro"]]} />
          </Field>
        </Grid>
```

- [ ] **Step 8: Sección "Contacto" — dirección separada en 3 campos**

Reemplazar:

```typescript
          <Field label="Dirección" full><Input value={form.address || ""} onChange={(v) => set("address", v)} /></Field>
```

con:

```typescript
          <Field label="Dirección"><Input value={form.address || ""} onChange={(v) => set("address", v)} placeholder="Calle" /></Field>
          <Field label="N° casa / depto"><Input value={form.address_number || ""} onChange={(v) => set("address_number", v)} /></Field>
          <Field label="Comuna"><Input value={form.comuna || ""} onChange={(v) => set("comuna", v)} /></Field>
```

(El campo "@Redes sociales" que sigue queda igual, sin cambios.)

- [ ] **Step 9: Nueva sección "Evaluación inicial (opcional)"**

Agregar esta `<Section>` completa, justo después de la sección `id="professional"` y antes
de la sección `id="parq"`:

```typescript
      <Section id="evaluation" title="Evaluación inicial (opcional)" open={open.evaluation} onToggle={toggle}>
        <p className="text-xs text-gray-400 mb-3">
          Si estás creando o editando este perfil durante una evaluación presencial, puedes
          registrar los datos aquí mismo. No es obligatorio: si lo dejas vacío, no se crea
          ningún registro en el historial de evaluaciones.
        </p>
        <BodyEvaluationFormFields form={evalForm} onChange={setEvalForm} />
      </Section>
```

- [ ] **Step 10: Sección "Enfermedades / condiciones" — agregar "Otra"**

Reemplazar:

```typescript
      <Section id="conditions" title="Enfermedades / condiciones a considerar" open={open.conditions} onToggle={toggle}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {COMMON_DISEASES.map((d) => {
            const checked = (form.diseases || []).includes(d.key);
            return (
              <label key={d.key}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                  checked ? "bg-rose-500/10 border-rose-500/30 text-rose-200" : "bg-[#0f131a] border-white/10 text-gray-400 hover:text-white"
                }`}>
                <input type="checkbox" checked={checked} onChange={() => toggleDisease(d.key)} />
                <span className="text-xs">{d.label}</span>
              </label>
            );
          })}
        </div>
      </Section>
```

con:

```typescript
      <Section id="conditions" title="Enfermedades / condiciones a considerar" open={open.conditions} onToggle={toggle}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {COMMON_DISEASES.map((d) => {
            const checked = (form.diseases || []).includes(d.key);
            return (
              <label key={d.key}
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                  checked ? "bg-rose-500/10 border-rose-500/30 text-rose-200" : "bg-[#0f131a] border-white/10 text-gray-400 hover:text-white"
                }`}>
                <input type="checkbox" checked={checked} onChange={() => toggleDisease(d.key)} />
                <span className="text-xs">{d.label}</span>
              </label>
            );
          })}
          <label
            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
              (form.diseases || []).includes("otra") ? "bg-rose-500/10 border-rose-500/30 text-rose-200" : "bg-[#0f131a] border-white/10 text-gray-400 hover:text-white"
            }`}>
            <input type="checkbox" checked={(form.diseases || []).includes("otra")} onChange={() => toggleDisease("otra")} />
            <span className="text-xs">Otra</span>
          </label>
        </div>
        {(form.diseases || []).includes("otra") && (
          <div className="mt-3">
            <Field label="Especificar" full>
              <Input value={form.diseases_other || ""} onChange={(v) => set("diseases_other", v)} />
            </Field>
          </div>
        )}
      </Section>
```

- [ ] **Step 11: "Contacto de emergencia" — pasa a lista de 1+ contactos**

Reemplazar:

```typescript
      <Section id="emergency" title="Contacto de emergencia" open={open.emergency} onToggle={toggle}>
        <Grid>
          <Field label="Nombre"><Input value={form.emergency_contact_name || ""} onChange={(v) => set("emergency_contact_name", v)} /></Field>
          <Field label="Teléfono"><Input value={form.emergency_contact_phone || ""} onChange={(v) => set("emergency_contact_phone", v)} /></Field>
          <Field label="Relación"><Input value={form.emergency_contact_relation || ""} onChange={(v) => set("emergency_contact_relation", v)} placeholder="Padre, pareja, amigo…" /></Field>
        </Grid>
      </Section>
```

con:

```typescript
      <Section id="emergency" title="Contacto de emergencia" open={open.emergency} onToggle={toggle}>
        <RepeatRows
          items={(form.emergency_contacts as EmergencyContact[]) || []}
          onAdd={() => addRow<EmergencyContact>("emergency_contacts", { name: "", phone: "", relation: "" })}
          onRemove={(i) => removeRow("emergency_contacts", i)}
          render={(row, i) => (
            <>
              <Input value={row.name} onChange={(v) => updateRow("emergency_contacts", i, { name: v })} placeholder="Nombre" className="flex-1 min-w-[140px]" />
              <Input value={row.phone || ""} onChange={(v) => updateRow("emergency_contacts", i, { phone: v })} placeholder="Teléfono" className="w-36" />
              <Input value={row.relation || ""} onChange={(v) => updateRow("emergency_contacts", i, { relation: v })} placeholder="Padre, pareja, amigo…" className="w-44" />
            </>
          )} />
      </Section>
```

- [ ] **Step 12: "Información adicional" — quitar "URL Foto"**

Reemplazar:

```typescript
      <Section id="extra" title="Información adicional" open={open.extra} onToggle={toggle}>
        <Grid>
          <Field label="Información médica extra importante" full>
            <Textarea value={form.medical_info_extra || ""} onChange={(v) => set("medical_info_extra", v)} rows={3} />
          </Field>
          <Field label="Información personal importante" full>
            <Textarea value={form.personal_info_extra || ""} onChange={(v) => set("personal_info_extra", v)} rows={3} />
          </Field>
          <Field label="URL Foto (opcional)"><Input value={form.photo_url || ""} onChange={(v) => set("photo_url", v)} placeholder="https://..." /></Field>
        </Grid>
      </Section>
```

con:

```typescript
      <Section id="extra" title="Información adicional" open={open.extra} onToggle={toggle}>
        <Grid>
          <Field label="Información médica extra importante" full>
            <Textarea value={form.medical_info_extra || ""} onChange={(v) => set("medical_info_extra", v)} rows={3} />
          </Field>
          <Field label="Información personal importante" full>
            <Textarea value={form.personal_info_extra || ""} onChange={(v) => set("personal_info_extra", v)} rows={3} />
          </Field>
        </Grid>
      </Section>
```

- [ ] **Step 13: "Datos administrativos" — nuevo texto de consentimiento**

Reemplazar:

```typescript
          <Field label="Consentimiento informado">
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" checked={!!form.informed_consent_signed}
                onChange={(e) => set("informed_consent_signed", e.target.checked)} />
              Firmado
            </label>
          </Field>
```

con:

```typescript
          <Field label="Consentimiento de datos personales" full>
            <div className="space-y-2">
              <a href={DATA_CONSENT_DOCUMENT_URL} target="_blank" rel="noreferrer"
                className="text-xs text-[#00d4ff] underline inline-block">
                Ver documento de tratamiento de datos personales
              </a>
              <label className="flex items-center gap-2 text-sm text-white">
                <input type="checkbox" checked={!!form.informed_consent_signed}
                  onChange={(e) => set("informed_consent_signed", e.target.checked)} />
                Acepto el tratamiento de mis datos personales
              </label>
            </div>
          </Field>
```

- [ ] **Step 14: Fix `RepeatRows` — X siempre en la misma fila en desktop**

Reemplazar:

```typescript
function RepeatRows<T>({ items, onAdd, onRemove, render }: {
  items: T[]; onAdd: () => void; onRemove: (i: number) => void;
  render: (row: T, i: number) => any;
}) {
  return (
    <div className="space-y-2">
      {items.map((row, i) => (
        <div key={i} className="flex flex-wrap gap-2 items-start">
          {render(row, i)}
          <button type="button" onClick={() => onRemove(i)}
            className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs font-semibold hover:bg-white/[0.08] transition">
        <Plus className="w-3.5 h-3.5" /> Agregar
      </button>
    </div>
  );
}
```

con:

```typescript
function RepeatRows<T>({ items, onAdd, onRemove, render }: {
  items: T[]; onAdd: () => void; onRemove: (i: number) => void;
  render: (row: T, i: number) => any;
}) {
  return (
    <div className="space-y-2">
      {items.map((row, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex flex-1 flex-wrap gap-2">{render(row, i)}</div>
          <button type="button" onClick={() => onRemove(i)}
            className="shrink-0 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs font-semibold hover:bg-white/[0.08] transition">
        <Plus className="w-3.5 h-3.5" /> Agregar
      </button>
    </div>
  );
}
```

- [ ] **Step 15: Typecheck**

`npm run typecheck` — sin errores nuevos en `PatientForm.tsx`.

- [ ] **Step 16: Commit**

```bash
git add client/components/dashboard/PatientForm.tsx
git commit -m "feat(patient-form): UI fixes, split address, multi-contact emergency, otra enfermedad, evaluación inicial opcional, nuevo texto de consentimiento"
```

---

### Task 13: Regresión de la ronda 2

- [ ] **Step 1:** `npm run test` — mismo resultado esperado que el cierre de la ronda 1
  (36/37, la única falla es la pre-existente y no relacionada de
  `phase-5-features.spec.ts`).
- [ ] **Step 2:** `npm run typecheck` — cero errores nuevos en los 7 archivos tocados en
  esta ronda (`migrations/025_profile_fields_v2.sql` no aplica a typecheck;
  `client/services/supabase.ts`, `netlify/functions/admin-create-patient.ts`,
  `client/components/dashboard/BodyEvaluationFields.tsx`,
  `client/components/dashboard/EvaluationsPanel.tsx`,
  `client/components/dashboard/PatientForm.tsx`).
- [ ] **Step 3:** Verificación manual/esquema en vivo: confirmar que
  `next_socio_number()` devuelve `HTKTOP-001` (o el siguiente correlativo), que
  `emergency_contacts` tiene la fila migrada, y que `PatientForm.tsx` ya no referencia
  ningún campo eliminado.
- [ ] **Step 4:** Commit de cualquier fix encontrado durante la regresión.

---

## Addendum self-review

**Cobertura del feedback:** los 7 puntos de bugs/UI (Hijos, RepeatRows, "Otra" enfermedad,
contacto de emergencia múltiple, quitar URL Foto, copy de socio_number) más los 9 puntos
de "acción según excel" (edad visible, fecha de ingreso, dirección separada, hábitos/
vitales/kinésica/composición ya cubiertos por Evaluaciones + ahora también opcionales en
creación, texto de consentimiento) están cubiertos en las Tasks 8-12. Lo explícitamente
diferido (modal→página, reasignación manual de prefijos `HTK-`) queda fuera, como acordó
el usuario.

**Consistencia de tipos:** `BodyEvalFormState`/`EMPTY_BODY_EVAL_FORM`/
`buildBodyEvaluationPayload`/`isBodyEvalFormEmpty`/`BodyEvaluationFormFields` (Task 11) son
exactamente lo que consume Task 12's nueva sección — mismos nombres, mismo shape que ya
usa `EvaluationsPanel.tsx` tras su propio refactor en el mismo Task 11.

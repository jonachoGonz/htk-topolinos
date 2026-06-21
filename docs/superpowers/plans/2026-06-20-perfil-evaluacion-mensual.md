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

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

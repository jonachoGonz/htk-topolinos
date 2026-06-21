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
      habits: hasHabits ? habits : null,
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

// =============================================================
// Strength
// =============================================================
function StrengthSection({
  items, patientId, professionalId, onChanged,
}: {
  items: StrengthEvaluation[];
  patientId: string;
  professionalId: string | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    measured_at: todayIso(),
    exercise: "sentadilla" as StrengthExerciseKey,
    weight_kg: "",
    reps: "1",
    notes: "",
  });

  const save = async () => {
    const w = Number(form.weight_kg);
    const r = Number(form.reps);
    if (!Number.isFinite(w) || w <= 0) {
      toast.error("Peso inválido");
      return;
    }
    if (!Number.isFinite(r) || r <= 0) {
      toast.error("Repeticiones inválidas");
      return;
    }
    setSaving(true);
    const res = await createStrengthEvaluation({
      patient_id: patientId,
      professional_id: professionalId,
      measured_at: form.measured_at,
      exercise: form.exercise,
      weight_kg: w,
      reps: r,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (res.success) {
      toast.success("Registro agregado");
      setForm({ measured_at: todayIso(), exercise: "sentadilla", weight_kg: "", reps: "1", notes: "" });
      setOpen(false);
      onChanged();
    } else {
      toast.error(`Error: ${res.error}`);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este registro?")) return;
    const r = await deleteStrengthEvaluation(id);
    if (r.success) { toast.success("Eliminado"); onChanged(); }
    else toast.error(`Error: ${r.error}`);
  };

  const labelFor = (k: string) =>
    STRENGTH_EXERCISES.find((e) => e.key === k)?.label ?? k;

  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-emerald-300" />
          <h3 className="text-white font-semibold font-lexend text-sm">Evaluación de fuerza</h3>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          {open ? "Cancelar" : "Nuevo registro"}
        </button>
      </header>

      {open && (
        <div className="bg-[#0f131a] border border-white/10 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Fecha" type="date" value={form.measured_at}
              onChange={(v) => setForm({ ...form, measured_at: v })} />
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Ejercicio</label>
              <select
                value={form.exercise}
                onChange={(e) => setForm({ ...form, exercise: e.target.value as StrengthExerciseKey })}
                className="w-full bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[40px]"
              >
                {STRENGTH_EXERCISES.map((e) => (
                  <option key={e.key} value={e.key}>{e.label}</option>
                ))}
              </select>
            </div>
            <Field label="Peso (kg)" value={form.weight_kg}
              onChange={(v) => setForm({ ...form, weight_kg: v })} />
            <Field label="Reps" value={form.reps}
              onChange={(v) => setForm({ ...form, reps: v })} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Notas</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-400 text-emerald-950 font-semibold text-sm hover:bg-emerald-300 transition disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">Sin registros de fuerza.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="text-[10px] uppercase tracking-wider text-gray-500">
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-3">Fecha</th>
                <th className="text-left px-2">Ejercicio</th>
                <th className="text-right px-2">Peso (kg)</th>
                <th className="text-right px-2">Reps</th>
                <th />
              </tr>
            </thead>
            <tbody className="font-inter text-white/90">
              {items.map((s) => (
                <tr key={s.id} className="border-b border-white/[0.04]">
                  <td className="py-2 pr-3 tabular-nums">{s.measured_at}</td>
                  <td className="px-2">{labelFor(s.exercise)}</td>
                  <td className="text-right px-2 tabular-nums">{s.weight_kg}</td>
                  <td className="text-right px-2 tabular-nums">{s.reps}</td>
                  <td className="text-right pl-2">
                    <button
                      onClick={() => remove(s.id)}
                      className="p-1 text-gray-500 hover:text-red-400 transition"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Field({
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

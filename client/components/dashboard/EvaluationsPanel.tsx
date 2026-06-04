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
// Body composition
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
  const [form, setForm] = useState({
    measured_at: todayIso(),
    weight_kg: "",
    body_fat_pct: "",
    muscle_mass_pct: "",
    waist_cm: "",
    hip_cm: "",
    chest_cm: "",
    arm_cm: "",
    thigh_cm: "",
    calf_cm: "",
    notes: "",
  });

  const reset = () => setForm({
    measured_at: todayIso(),
    weight_kg: "", body_fat_pct: "", muscle_mass_pct: "",
    waist_cm: "", hip_cm: "", chest_cm: "", arm_cm: "", thigh_cm: "", calf_cm: "",
    notes: "",
  });

  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const save = async () => {
    setSaving(true);
    const r = await createBodyEvaluation({
      patient_id: patientId,
      professional_id: professionalId,
      measured_at: form.measured_at,
      weight_kg: num(form.weight_kg),
      body_fat_pct: num(form.body_fat_pct),
      muscle_mass_pct: num(form.muscle_mass_pct),
      waist_cm: num(form.waist_cm),
      hip_cm: num(form.hip_cm),
      chest_cm: num(form.chest_cm),
      arm_cm: num(form.arm_cm),
      thigh_cm: num(form.thigh_cm),
      calf_cm: num(form.calf_cm),
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (r.success) {
      toast.success("Evaluación registrada");
      reset();
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

  return (
    <section>
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-white font-semibold font-lexend text-sm">Composición corporal</h3>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00d4ff]/15 text-[#00d4ff] text-xs font-semibold hover:bg-[#00d4ff]/25 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          {open ? "Cancelar" : "Nueva medición"}
        </button>
      </header>

      {open && (
        <div className="bg-[#0f131a] border border-white/10 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Fecha" type="date" value={form.measured_at}
              onChange={(v) => setForm({ ...form, measured_at: v })} />
            <Field label="Peso (kg)" value={form.weight_kg}
              onChange={(v) => setForm({ ...form, weight_kg: v })} />
            <Field label="% Grasa" value={form.body_fat_pct}
              onChange={(v) => setForm({ ...form, body_fat_pct: v })} />
            <Field label="% Músculo" value={form.muscle_mass_pct}
              onChange={(v) => setForm({ ...form, muscle_mass_pct: v })} />
            <Field label="Cintura (cm)" value={form.waist_cm}
              onChange={(v) => setForm({ ...form, waist_cm: v })} />
            <Field label="Cadera (cm)" value={form.hip_cm}
              onChange={(v) => setForm({ ...form, hip_cm: v })} />
            <Field label="Pecho (cm)" value={form.chest_cm}
              onChange={(v) => setForm({ ...form, chest_cm: v })} />
            <Field label="Brazo (cm)" value={form.arm_cm}
              onChange={(v) => setForm({ ...form, arm_cm: v })} />
            <Field label="Muslo (cm)" value={form.thigh_cm}
              onChange={(v) => setForm({ ...form, thigh_cm: v })} />
            <Field label="Pantorrilla (cm)" value={form.calf_cm}
              onChange={(v) => setForm({ ...form, calf_cm: v })} />
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
        <p className="text-gray-500 text-sm py-4">Sin mediciones registradas.</p>
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
                <tr key={b.id} className="border-b border-white/[0.04]">
                  <td className="py-2 pr-3 tabular-nums">{b.measured_at}</td>
                  <td className="text-right px-2 tabular-nums">{b.weight_kg ?? "—"}</td>
                  <td className="text-right px-2 tabular-nums">{b.body_fat_pct ?? "—"}</td>
                  <td className="text-right px-2 tabular-nums">{b.muscle_mass_pct ?? "—"}</td>
                  <td className="text-right px-2 tabular-nums">{b.waist_cm ?? "—"}</td>
                  <td className="text-right px-2 tabular-nums">{b.chest_cm ?? "—"}</td>
                  <td className="text-right px-2 tabular-nums">{b.arm_cm ?? "—"}</td>
                  <td className="text-right px-2 tabular-nums">{b.thigh_cm ?? "—"}</td>
                  <td className="text-right pl-2">
                    <button
                      onClick={() => remove(b.id)}
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

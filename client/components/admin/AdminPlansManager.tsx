import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Star, X, Save, DollarSign, Eye, EyeOff, ArrowUp, ArrowDown, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPlanTemplates,
  createPlanTemplate,
  updatePlanTemplate,
  deletePlanTemplate,
  setDefaultPlanTemplate,
  type PlanTemplate,
  type RenewalPeriod,
  type SessionType,
} from "@/services/supabase";

const RENEWAL_OPTIONS: { value: RenewalPeriod; label: string }[] = [
  { value: "monthly", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const SESSION_TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: "kinesiologia", label: "Kinesiología" },
  { value: "terapia", label: "Terapia" },
  { value: "nutricional", label: "Nutricional" },
  { value: "otra", label: "Otra" },
];

const emptyPlan = (): Omit<PlanTemplate, "id" | "created_at" | "updated_at"> => ({
  name: "",
  description: "",
  description_rich: "",
  monthly_classes: 4,
  allowed_renewals: ["monthly"],
  prices: { monthly: 0, trimestral: 0, semestral: 0, anual: 0 },
  accepts_discount_codes: false,
  discount_code: null,
  includes_sessions: false,
  session_count_monthly: 0,
  session_type: null,
  is_active: true,
  is_default: false,
  show_on_landing: true,
  display_order: 100,
  highlight: false,
  badge_text: null,
});

export default function AdminPlansManager() {
  const { isAdmin } = useAuth();
  const [plans, setPlans] = useState<PlanTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PlanTemplate | null>(null);
  const [form, setForm] = useState<Omit<PlanTemplate, "id" | "created_at" | "updated_at">>(
    emptyPlan()
  );

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    const res = await getPlanTemplates(true);
    if (res.success) setPlans(res.data || []);
    else toast.error(`Error: ${res.error}`);
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPlan());
    setShowForm(true);
  };

  const openEdit = (p: PlanTemplate) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      description_rich: p.description_rich ?? "",
      monthly_classes: p.monthly_classes,
      allowed_renewals: p.allowed_renewals || ["monthly"],
      prices: p.prices || { monthly: 0, trimestral: 0, semestral: 0, anual: 0 },
      accepts_discount_codes: !!p.accepts_discount_codes,
      discount_code: p.discount_code ?? null,
      includes_sessions: !!p.includes_sessions,
      session_count_monthly: p.session_count_monthly ?? 0,
      session_type: p.session_type ?? null,
      is_active: p.is_active,
      is_default: p.is_default,
      show_on_landing: p.show_on_landing ?? true,
      display_order: p.display_order ?? 100,
      highlight: p.highlight ?? false,
      badge_text: p.badge_text ?? null,
    });
    setShowForm(true);
  };

  const toggleVisibility = async (p: PlanTemplate) => {
    const r = await updatePlanTemplate(p.id, { show_on_landing: !p.show_on_landing });
    if (r.success) {
      toast.success(p.show_on_landing ? "Plan oculto en la web" : "Plan visible en la web");
      fetchPlans();
    } else toast.error(`Error: ${r.error}`);
  };

  const reorder = async (p: PlanTemplate, direction: "up" | "down") => {
    const sorted = [...plans].sort(
      (a, b) => (a.display_order ?? 100) - (b.display_order ?? 100)
    );
    const idx = sorted.findIndex((x) => x.id === p.id);
    if (idx < 0) return;
    const swap = direction === "up" ? sorted[idx - 1] : sorted[idx + 1];
    if (!swap) return;
    const aOrder = p.display_order ?? 100;
    const bOrder = swap.display_order ?? 100;
    await updatePlanTemplate(p.id, { display_order: bOrder });
    await updatePlanTemplate(swap.id, { display_order: aOrder });
    fetchPlans();
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const toggleRenewal = (period: RenewalPeriod) => {
    setForm((f) => {
      const next = f.allowed_renewals.includes(period)
        ? f.allowed_renewals.filter((r) => r !== period)
        : [...f.allowed_renewals, period];
      return { ...f, allowed_renewals: next.length === 0 ? ["monthly"] : next };
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nombre del plan requerido");
      return;
    }
    if (form.monthly_classes < 0) {
      toast.error("Clases mensuales no puede ser negativo");
      return;
    }
    if (form.accepts_discount_codes && !form.discount_code?.trim()) {
      toast.error("Si admite códigos de descuento, debes ingresar uno");
      return;
    }
    if (form.includes_sessions) {
      if (!form.session_type) {
        toast.error("Selecciona el tipo de sesión incluida");
        return;
      }
      if (form.session_count_monthly < 1) {
        toast.error("Sesiones incluidas debe ser >= 1");
        return;
      }
    }

    const res = editing
      ? await updatePlanTemplate(editing.id, form)
      : await createPlanTemplate(form);

    if (res.success) {
      toast.success(editing ? "Plan actualizado" : "Plan creado");
      closeForm();
      fetchPlans();
    } else {
      const err = (res as any).error ?? "Error desconocido";
      // Surface RLS rejections clearly — they are the #1 reason an edit
      // appears to silently fail.
      const isRls = /policy|row.?level|permission|denied/i.test(err);
      console.error("[AdminPlansManager] save failed:", err);
      toast.error(
        isRls
          ? `Sin permisos para guardar (RLS). Tu cuenta debe tener is_admin=true. Detalle: ${err}`
          : `Error guardando plan: ${err}`,
        { duration: 8000 },
      );
    }
  };

  const handleDelete = async (p: PlanTemplate) => {
    if (p.is_default) {
      toast.error("No puedes eliminar el plan por defecto. Primero designa otro como default.");
      return;
    }
    if (!confirm(`¿Eliminar (desactivar) el plan "${p.name}"?`)) return;
    const res = await deletePlanTemplate(p.id);
    if (res.success) {
      toast.success("Plan desactivado");
      fetchPlans();
    } else {
      toast.error(`Error: ${res.error}`);
    }
  };

  const handleSetDefault = async (p: PlanTemplate) => {
    const res = await setDefaultPlanTemplate(p.id);
    if (res.success) {
      toast.success(`"${p.name}" es ahora el plan por defecto`);
      fetchPlans();
    } else {
      toast.error(`Error: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6">
      {!isAdmin && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm leading-relaxed">
            <strong>Modo solo-lectura.</strong> Tu cuenta no tiene{" "}
            <code className="text-xs">is_admin=true</code>. Las operaciones de
            crear/editar/eliminar serán rechazadas por la RLS de Supabase.
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white font-montserrat">Gestión de Planes</h2>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Crear, editar y administrar los planes que se ofrecen a los alumnos.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] rounded-lg font-bold font-lexend transition"
        >
          <Plus className="w-4 h-4" />
          Crear Plan
        </button>
      </div>

      {/* Plans table */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-8 text-center text-gray-500">Cargando planes...</div>
        ) : plans.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No hay planes creados aún.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.06]">
                <tr className="text-left text-xs font-inter text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Clases/mes</th>
                  <th className="px-6 py-3">Precio mensual</th>
                  <th className="px-6 py-3">Renovación</th>
                  <th className="px-6 py-3">Sesiones</th>
                  <th className="px-6 py-3">Descuentos</th>
                  <th className="px-6 py-3">Web</th>
                  <th className="px-6 py-3">Orden</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {plans.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition text-white">
                    <td className="px-6 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {p.is_default && (
                          <span title="Plan por defecto">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          </span>
                        )}
                        {p.name}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-400">{p.monthly_classes}</td>
                    <td className="px-6 py-3 text-gray-400">
                      {p.prices?.monthly?.toLocaleString("es-CL") ?? 0} CLP
                    </td>
                    <td className="px-6 py-3 text-gray-400">
                      {(p.allowed_renewals || []).map((r) => (
                        <span
                          key={r}
                          className="inline-block mr-1 px-1.5 py-0.5 rounded text-[10px] bg-white/5 border border-white/10"
                        >
                          {r}
                        </span>
                      ))}
                    </td>
                    <td className="px-6 py-3 text-gray-400">
                      {p.includes_sessions
                        ? `${p.session_count_monthly} ${p.session_type}`
                        : "—"}
                    </td>
                    <td className="px-6 py-3 text-gray-400">
                      {p.accepts_discount_codes ? (
                        <span className="text-emerald-400 text-xs">
                          {p.discount_code || "Sí"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => toggleVisibility(p)}
                        title={p.show_on_landing ? "Ocultar de la web" : "Mostrar en la web"}
                        className={`p-1.5 rounded transition ${
                          p.show_on_landing
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20"
                        }`}
                      >
                        {p.show_on_landing ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => reorder(p, "up")}
                          className="p-1 rounded hover:bg-white/10 text-gray-400">
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs text-gray-400 w-6 text-center">{p.display_order ?? 100}</span>
                        <button onClick={() => reorder(p, "down")}
                          className="p-1 rounded hover:bg-white/10 text-gray-400">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          p.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                        }`}
                      >
                        {p.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        {!p.is_default && p.is_active && (
                          <button
                            onClick={() => handleSetDefault(p)}
                            className="flex items-center gap-1 px-2 py-1 text-yellow-400 hover:bg-yellow-500/10 rounded transition text-xs"
                            title="Marcar como plan por defecto"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(p)}
                          className="flex items-center gap-1 px-2 py-1 text-blue-400 hover:bg-blue-500/10 rounded transition text-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          className="flex items-center gap-1 px-2 py-1 text-red-400 hover:bg-red-500/10 rounded transition text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={closeForm}
        >
          <div
            className="bg-[#0a0e1a] border border-white/10 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#0a0e1a] border-b border-white/10 p-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white font-montserrat">
                {editing ? `Editar plan: ${editing.name}` : "Crear nuevo plan"}
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="text-xs font-inter text-gray-400 uppercase mb-1.5 block">
                  Nombre del plan *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Plan Premium"
                  className="w-full bg-[#0f131a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
                />
              </div>

              {/* Monthly classes */}
              <div>
                <label className="text-xs font-inter text-gray-400 uppercase mb-1.5 block">
                  Clases mensuales *
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.monthly_classes}
                  onChange={(e) =>
                    setForm({ ...form, monthly_classes: parseInt(e.target.value) || 0 })
                  }
                  className="w-full bg-[#0f131a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
                />
              </div>

              {/* Allowed renewals */}
              <div>
                <label className="text-xs font-inter text-gray-400 uppercase mb-1.5 block">
                  Permite renovación
                </label>
                <div className="flex gap-2 flex-wrap">
                  {RENEWAL_OPTIONS.map((r) => {
                    const checked = form.allowed_renewals.includes(r.value);
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => toggleRenewal(r.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          checked
                            ? "bg-[#00d4ff]/15 border border-[#00d4ff]/40 text-[#00d4ff]"
                            : "bg-[#0f131a] border border-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prices */}
              <div>
                <label className="text-xs font-inter text-gray-400 uppercase mb-1.5 block">
                  Precios por periodo (CLP)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {RENEWAL_OPTIONS.map((r) => {
                    const enabled = form.allowed_renewals.includes(r.value);
                    return (
                      <div key={r.value}>
                        <span className="text-[10px] uppercase text-gray-500">{r.label}</span>
                        <div className="flex items-center bg-[#0f131a] border border-white/10 rounded-lg px-2 mt-1">
                          <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                          <input
                            type="number"
                            min="0"
                            disabled={!enabled}
                            value={form.prices[r.value]}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                prices: {
                                  ...form.prices,
                                  [r.value]: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full bg-transparent py-2 px-2 text-sm text-white focus:outline-none disabled:opacity-40"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discount codes */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.accepts_discount_codes}
                    onChange={(e) =>
                      setForm({ ...form, accepts_discount_codes: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-white font-inter">
                    Admite códigos de descuento
                  </span>
                </label>
                {form.accepts_discount_codes && (
                  <input
                    type="text"
                    value={form.discount_code ?? ""}
                    onChange={(e) => setForm({ ...form, discount_code: e.target.value })}
                    placeholder="Ej: BIENVENIDO10"
                    className="w-full bg-[#0f131a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
                  />
                )}
              </div>

              {/* Description rich text */}
              <div>
                <label className="text-xs font-inter text-gray-400 uppercase mb-1.5 block">
                  Descripción (acepta Markdown)
                </label>
                <textarea
                  rows={4}
                  value={form.description_rich ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description_rich: e.target.value,
                      description: e.target.value, // mirror to legacy plain
                    })
                  }
                  placeholder="## Plan Premium&#10;&#10;Incluye **8 clases** mensuales y *bonificaciones*..."
                  className="w-full bg-[#0f131a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40 font-mono text-xs"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Puedes usar **negrita**, *cursiva*, ## títulos, listas, etc.
                </p>
              </div>

              {/* Sessions included */}
              <div className="space-y-2 p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.includes_sessions}
                    onChange={(e) =>
                      setForm({ ...form, includes_sessions: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-white font-inter">
                    Incluye sesiones de terapia / kinesiología / nutricional / otra
                  </span>
                </label>
                {form.includes_sessions && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 mb-1 block">
                        Sesiones mensuales
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.session_count_monthly}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            session_count_monthly: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-[#0f131a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 mb-1 block">
                        Tipo de sesión
                      </label>
                      <select
                        value={form.session_type ?? ""}
                        onChange={(e) =>
                          setForm({ ...form, session_type: e.target.value as SessionType })
                        }
                        className="w-full bg-[#0f131a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
                      >
                        <option value="">— Seleccionar —</option>
                        {SESSION_TYPE_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Active + Default + Landing visibility */}
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-6 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="rounded" />
                    <span className="text-sm text-white">Activo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_default}
                      onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                      className="rounded" />
                    <span className="text-sm text-white">
                      Plan por defecto (asignado a nuevos alumnos)
                    </span>
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-[#0a0e1a] border border-white/[0.04]">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                    <input type="checkbox" checked={form.show_on_landing ?? true}
                      onChange={(e) => setForm({ ...form, show_on_landing: e.target.checked })} />
                    <Eye className="w-3.5 h-3.5 text-emerald-400" /> Mostrar en la web
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                    <input type="checkbox" checked={form.highlight ?? false}
                      onChange={(e) => setForm({ ...form, highlight: e.target.checked })} />
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Destacar en la web
                  </label>
                  <Field label="Orden (menor = primero)">
                    <input type="number" value={String(form.display_order ?? 100)}
                      onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 100 })}
                      className="w-full bg-[#0f131a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
                  </Field>
                </div>
                {form.highlight && (
                  <Field label="Texto del badge (opcional)">
                    <input value={form.badge_text || ""}
                      onChange={(e) => setForm({ ...form, badge_text: e.target.value })}
                      placeholder="Ej: Más popular, Recomendado"
                      className="w-full bg-[#0f131a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
                  </Field>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#0a0e1a] border-t border-white/10 p-4 flex justify-end gap-2">
              <button
                onClick={closeForm}
                className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.08] transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] text-sm font-bold font-lexend transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editing ? "Guardar cambios" : "Crear plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

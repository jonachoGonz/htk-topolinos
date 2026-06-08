import { useEffect, useState, useMemo } from "react";
import { Eye, Search, Pause, Loader2, Trash2, MessageCircle, AlertTriangle, UserPlus, X, Mail, Loader } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllPatients,
  getAllPatientsAttendance,
  deletePatient,
  computeAge,
  adminCreatePatient,
  listAssignedStudentIds,
  type PatientProfile,
  type PatientAttendance,
} from "@/services/supabase";
import PatientDetailModal from "./PatientDetailModal";
import TeacherDetailModal from "./TeacherDetailModal";

interface PatientsListProps {
  professionalId?: string;
  onAddNote?: (patientId: string) => void;
  onViewProgress?: (patientId: string) => void;
  /**
   * Filtra qué rol muestra el listado. Default "student" para no romper
   * los usos existentes. AdminSection lo usa con "teacher" en el tab
   * "Profesionales" reutilizando el mismo componente.
   */
  roleFilter?: "student" | "teacher";
}

// Critical conditions that warrant a visible alert badge on the list card.
// (Open the patient form to manage these in 'Enfermedades / condiciones')
const CRITICAL_DISEASE_KEYS = new Set([
  "diabetes_t1", "epilepsia", "cardio", "marcapasos", "embarazo", "cancer",
]);
const CRITICAL_DISEASE_LABELS: Record<string, string> = {
  diabetes_t1: "Diabetes T1",
  epilepsia: "Epilepsia",
  cardio: "Cardiopatía",
  marcapasos: "Marcapasos",
  embarazo: "Embarazo",
  cancer: "Cáncer",
};

function whatsappLink(phone: string): string {
  // Normalize: keep only digits. If starts with 9 and 8 more digits, assume Chile +56.
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  // Chilean mobile pattern: 56 9 XXXXXXXX or 9XXXXXXXX
  const withCountry =
    digits.length === 9 && digits.startsWith("9") ? `56${digits}` :
    digits.length === 8 ? `569${digits}` :
    digits;
  return `https://wa.me/${withCountry}`;
}

export default function PatientsList({ roleFilter = "student" }: PatientsListProps) {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [attendance, setAttendance] = useState<Record<string, PatientAttendance>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showPaused, setShowPaused] = useState(true);
  const [selected, setSelected] = useState<PatientProfile | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: "", email: "", phone: "", rut_dni: "", password: "", send_invite: false,
    role: roleFilter as "student" | "teacher",
  });
  const [creating, setCreating] = useState(false);
  const { isAdmin, user } = useAuth();

  const isTeacherView = roleFilter === "teacher";
  const entityLabel = isTeacherView ? "profesional" : "paciente";
  const entityLabelPlural = isTeacherView ? "profesionales" : "pacientes";

  const fetchAll = async () => {
    setLoading(true);
    // Solo cargamos asistencia para el listado de alumnos.
    const requests: Promise<any>[] = [getAllPatients(roleFilter)];
    if (!isTeacherView) requests.push(getAllPatientsAttendance());
    const [pRes, aRes] = await Promise.all(requests);

    let patientsData = pRes.success ? pRes.data || [] : [];

    // Profesor NO admin viendo el listado de alumnos: filtrar a sus
    // asignados (M2M student_professionals). Admin ve todos.
    if (!isAdmin && roleFilter === "student" && user?.id) {
      const assignRes = await listAssignedStudentIds(user.id);
      if (assignRes.success) {
        const allowed = new Set(assignRes.data || []);
        patientsData = patientsData.filter((p) => allowed.has(p.id));
      }
    }

    setPatients(patientsData);
    if (!pRes.success) toast.error(`Error: ${pRes.error}`);
    if (!isTeacherView && aRes?.success) {
      const map: Record<string, PatientAttendance> = {};
      (aRes.data || []).forEach((s: PatientAttendance) => (map[s.patient_id] = s));
      setAttendance(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [roleFilter, user?.id, isAdmin]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return patients.filter((p) => {
      if (!showPaused && p.is_paused) return false;
      if (!q) return true;
      return (
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.rut_dni?.toLowerCase().includes(q)
      );
    });
  }, [patients, search, showPaused]);

  const handleCreate = async () => {
    if (!createForm.full_name.trim() || !createForm.email.trim()) {
      toast.error("Nombre y email son requeridos");
      return;
    }
    if (!createForm.send_invite && !createForm.password.trim()) {
      toast.error("Define una contraseña o marca 'Enviar invitación por email'");
      return;
    }
    if (createForm.password && createForm.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setCreating(true);
    const r = await adminCreatePatient({ ...createForm, role: createForm.role });
    if (r.success) {
      const noun = createForm.role === "teacher" ? "Profesional" : "Paciente";
      const created = createForm.role === "teacher" && roleFilter === "student"
        ? `${noun} creado. Cambia al tab "Profesionales" para verlo.`
        : (createForm.send_invite
            ? `${noun} creado. Email de invitación enviado a ${createForm.email}`
            : `${noun} creado. Email: ${createForm.email} / Contraseña: ${createForm.password}`);
      toast.success(created);
      setCreateModalOpen(false);
      setCreateForm({
        full_name: "", email: "", phone: "", rut_dni: "", password: "", send_invite: false,
        role: roleFilter,
      });
      if (createForm.role === roleFilter) fetchAll();
    } else {
      toast.error(`Error: ${r.error}`);
    }
    setCreating(false);
  };

  const handleDelete = async (p: PatientProfile) => {
    if (!confirm(`¿Eliminar a "${p.full_name}"? Esta acción pausa al alumno y desactiva su plan.`)) return;
    const r = await deletePatient(p.id);
    if (r.success) {
      toast.success("Paciente eliminado (pausado)");
      fetchAll();
    } else toast.error(`Error: ${r.error}`);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex items-center gap-2 bg-[#0f131a] border border-white/[0.08] rounded-xl px-3 flex-1">
          <Search className="w-4 h-4 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email o RUT…"
            className="flex-1 bg-transparent py-2.5 text-sm text-white focus:outline-none" />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" checked={showPaused} onChange={(e) => setShowPaused(e.target.checked)} />
          Mostrar pausados
        </label>
      </div>

      {/* Admin: create patient button */}
      {isAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setCreateForm((f) => ({ ...f, role: roleFilter }));
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] text-sm font-bold transition"
          >
            <UserPlus className="w-4 h-4" /> Crear {entityLabel}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-8 flex items-center justify-center text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando pacientes...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          {patients.length === 0 ? "No hay pacientes registrados." : "Sin resultados."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((p) => {
            const att = attendance[p.id];
            const age = computeAge(p.birth_date);
            const criticalConditions = (p.diseases || []).filter((d) =>
              CRITICAL_DISEASE_KEYS.has(d)
            );
            const parqNotCleared = p.parq_cleared === false;
            const waLink = p.phone ? whatsappLink(p.phone) : "";
            return (
              <div key={p.id}
                className={`bg-[#0f131a] border rounded-xl p-4 space-y-3 transition ${
                  p.is_paused ? "border-amber-500/30 opacity-75" : "border-white/[0.06] hover:border-white/10"
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#00d4ff] font-bold text-sm">
                          {(p.full_name || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold font-lexend text-sm truncate">{p.full_name || "Sin nombre"}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {p.email && <span className="text-gray-500 text-xs truncate max-w-[160px]">{p.email}</span>}
                        {age != null && <span className="text-gray-400 text-xs">{age} años</span>}
                        {p.is_paused && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Pause className="w-3 h-3" /> Pausado
                          </span>
                        )}
                      </div>
                      {/* Critical alerts row */}
                      {(criticalConditions.length > 0 || parqNotCleared) && (
                        <div className="flex items-center gap-1 flex-wrap mt-1.5">
                          {parqNotCleared && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
                              <AlertTriangle className="w-3 h-3" /> PAR-Q no apto
                            </span>
                          )}
                          {criticalConditions.map((d) => (
                            <span
                              key={d}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-300 border border-red-500/20"
                            >
                              {CRITICAL_DISEASE_LABELS[d] || d}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Quick WhatsApp contact */}
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Contactar por WhatsApp"
                      className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition flex-shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.04]">
                  <div>
                    <p className="text-[9px] uppercase text-gray-600">Sesiones</p>
                    <p className="text-white text-sm font-semibold">{att?.confirmed_count ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-gray-600">Asistencia</p>
                    <p className="text-emerald-400 text-sm font-semibold">
                      {att?.attendance_rate_pct != null ? `${att.attendance_rate_pct}%` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase text-gray-600">Última</p>
                    <p className="text-gray-300 text-xs">
                      {att?.last_attended_session
                        ? new Date(att.last_attended_session).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-white/[0.04]">
                  <button onClick={() => setSelected(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg text-xs font-semibold hover:bg-[#00d4ff]/20 transition">
                    <Eye className="w-3.5 h-3.5" /> Ver / Editar
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(p)}
                      className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/20 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && isTeacherView && (
        <TeacherDetailModal
          teacherId={selected.id}
          teacherName={selected.full_name || "Profesional"}
          onClose={() => { setSelected(null); fetchAll(); }}
        />
      )}
      {selected && !isTeacherView && (
        <PatientDetailModal
          patientId={selected.id}
          patientName={selected.full_name || "Paciente"}
          isPaused={!!selected.is_paused}
          pauseReason={selected.pause_reason}
          onClose={() => setSelected(null)}
          onChanged={fetchAll}
        />
      )}

      {/* Create patient modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => !creating && setCreateModalOpen(false)}>
          <div className="bg-[#0a0e1a] border border-white/10 rounded-xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white font-montserrat flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#00d4ff]" />
                {createForm.role === "teacher" ? "Crear profesional" : "Crear paciente"}
              </h3>
              <button onClick={() => !creating && setCreateModalOpen(false)}
                className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-3">
              {/* Selector de rol — admin puede crear alumnos o profesionales */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 block">
                  Tipo de cuenta *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: "student" })}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                      createForm.role === "student"
                        ? "bg-[#00d4ff]/15 border-[#00d4ff]/40 text-[#00d4ff]"
                        : "bg-[#0f131a] border-white/10 text-gray-300 hover:border-white/20"
                    }`}
                  >
                    Alumno
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: "teacher" })}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                      createForm.role === "teacher"
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-[#0f131a] border-white/10 text-gray-300 hover:border-white/20"
                    }`}
                  >
                    Profesional
                  </button>
                </div>
              </div>

              <Field label="Nombre completo *">
                <Input value={createForm.full_name}
                  onChange={(v) => setCreateForm({ ...createForm, full_name: v })} />
              </Field>
              <Field label="Email *">
                <Input type="email" value={createForm.email}
                  onChange={(v) => setCreateForm({ ...createForm, email: v })} />
              </Field>
              <Field label="Teléfono">
                <Input value={createForm.phone}
                  onChange={(v) => setCreateForm({ ...createForm, phone: v })} />
              </Field>
              <Field label="RUT">
                <Input value={createForm.rut_dni}
                  onChange={(v) => setCreateForm({ ...createForm, rut_dni: v })} />
              </Field>

              {!createForm.send_invite && (
                <Field label="Contraseña inicial * (mín. 6 caracteres)">
                  <Input
                    type="text"
                    value={createForm.password}
                    onChange={(v) => setCreateForm({ ...createForm, password: v })}
                  />
                  <button
                    type="button"
                    onClick={() => setCreateForm({
                      ...createForm,
                      password: "HTK-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
                    })}
                    className="text-[10px] text-[#00d4ff] hover:text-cyan-300 transition mt-1"
                  >
                    Generar contraseña aleatoria
                  </button>
                </Field>
              )}

              <label className="flex items-start gap-2 pt-2 cursor-pointer">
                <input type="checkbox" checked={createForm.send_invite}
                  onChange={(e) => setCreateForm({ ...createForm, send_invite: e.target.checked, password: "" })}
                  className="mt-0.5" />
                <span className="text-xs text-gray-300">
                  <strong>Enviar email de invitación en vez de contraseña</strong>
                  <span className="block text-gray-500 mt-0.5">
                    El paciente recibirá un link por email para crear su propia contraseña.
                  </span>
                </span>
              </label>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-[10px] text-blue-200">
                <Mail className="inline w-3 h-3 mr-1" />
                Requiere variables SUPABASE_SERVICE_ROLE_KEY + SUPABASE_URL en Netlify para funcionar en producción.
              </div>
            </div>

            <div className="px-5 py-3 border-t border-white/10 flex justify-end gap-2">
              <button onClick={() => setCreateModalOpen(false)} disabled={creating}
                className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.08] transition disabled:opacity-40">
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="px-4 py-2 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] text-sm font-bold transition flex items-center gap-2 disabled:opacity-40">
                {creating ? <Loader className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {createForm.role === "teacher" ? "Crear profesional" : "Crear paciente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{label}</label>
      {children}
    </div>
  );
}
function Input({ value, onChange, type = "text" }: any) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0f131a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
  );
}

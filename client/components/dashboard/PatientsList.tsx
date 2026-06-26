import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye, Search, Pause, Trash2, MessageCircle, AlertTriangle, UserPlus, X, Mail, Loader,
  ChevronUp, ChevronDown,
} from "lucide-react";
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
import { Skeleton } from "./Skeleton";

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
  const navigate = useNavigate();
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

  type SortField = "name" | "age" | "sessions" | "attendance" | "last";
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortField) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    const valueFor = (p: PatientProfile): number | string => {
      switch (sortField) {
        case "name":
          return (p.full_name || "").toLowerCase();
        case "age":
          return computeAge(p.birth_date) ?? -1;
        case "sessions":
          return attendance[p.id]?.confirmed_count ?? -1;
        case "attendance":
          return attendance[p.id]?.attendance_rate_pct ?? -1;
        case "last": {
          const d = attendance[p.id]?.last_attended_session;
          return d ? new Date(d).getTime() : -1;
        }
      }
    };
    return [...filtered].sort((a, b) => {
      const va = valueFor(a);
      const vb = valueFor(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filtered, sortField, sortDir, attendance]);

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
        <>
          <DesktopSkeletonRows showAttendanceCols={!isTeacherView} />
          <MobileSkeletonRows />
        </>
      ) : sorted.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          {patients.length === 0 ? "No hay pacientes registrados." : "Sin resultados."}
        </div>
      ) : (
        <>
          {/* Desktop: real table with sortable columns */}
          <div className="hidden lg:block border border-white/[0.06] rounded-xl">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10 bg-[#0a0e1a]">
                <tr className="border-b border-white/[0.06]">
                  <SortHeader label={entityLabel === "profesional" ? "Profesional" : "Alumno"} field="name" sortField={sortField} sortDir={sortDir} onSort={toggleSort} className="pl-4" />
                  <SortHeader label="Edad" field="age" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                  <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Estado</th>
                  {!isTeacherView && (
                    <>
                      <SortHeader label="Sesiones" field="sessions" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                      <SortHeader label="Asistencia" field="attendance" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                      <SortHeader label="Última" field="last" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                    </>
                  )}
                  <th className="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {sorted.map((p) => (
                  <PatientRow
                    key={p.id}
                    patient={p}
                    attendance={attendance[p.id]}
                    isTeacherView={isTeacherView}
                    isAdmin={isAdmin}
                    onOpen={() => navigate(isTeacherView ? `/dashboard/teachers/${p.id}` : `/dashboard/patients/${p.id}`)}
                    onDelete={() => handleDelete(p)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: compact row list */}
          <div className="lg:hidden divide-y divide-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden">
            {sorted.map((p) => (
              <PatientRowMobile
                key={p.id}
                patient={p}
                attendance={attendance[p.id]}
                isTeacherView={isTeacherView}
                isAdmin={isAdmin}
                onOpen={() => navigate(isTeacherView ? `/dashboard/teachers/${p.id}` : `/dashboard/patients/${p.id}`)}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </div>
        </>
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

              {createForm.send_invite && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-[10px] text-blue-200">
                  <Mail className="inline w-3 h-3 mr-1" />
                  Si el envío de invitaciones por email no está disponible, crea la cuenta con una contraseña inicial en su lugar.
                </div>
              )}
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

// ---------------------------------------------------------------------------
// Table / list rendering (desktop sortable table + mobile compact row list)
// ---------------------------------------------------------------------------

function SortHeader({ label, field, sortField, sortDir, onSort, className = "" }: {
  label: string;
  field: "name" | "age" | "sessions" | "attendance" | "last";
  sortField: string | null;
  sortDir: "asc" | "desc";
  onSort: (field: any) => void;
  className?: string;
}) {
  const active = sortField === field;
  return (
    <th className={`text-left px-3 py-2.5 ${className}`}>
      <button
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-gray-500 font-semibold hover:text-gray-300 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d4ff]/60 rounded"
      >
        {label}
        <span className="flex flex-col -space-y-1.5">
          <ChevronUp className={`w-3 h-3 ${active && sortDir === "asc" ? "text-[#00d4ff]" : "text-gray-600"}`} />
          <ChevronDown className={`w-3 h-3 ${active && sortDir === "desc" ? "text-[#00d4ff]" : "text-gray-600"}`} />
        </span>
      </button>
    </th>
  );
}

function patientAlerts(p: PatientProfile) {
  const criticalConditions = (p.diseases || []).filter((d) => CRITICAL_DISEASE_KEYS.has(d));
  const parqNotCleared = p.parq_cleared === false;
  return { criticalConditions, parqNotCleared };
}

function StatusBadges({ patient, emptyFallback = true }: { patient: PatientProfile; emptyFallback?: boolean }) {
  const { criticalConditions, parqNotCleared } = patientAlerts(patient);
  const hasAlerts = patient.is_paused || parqNotCleared || criticalConditions.length > 0;
  if (!hasAlerts) {
    return emptyFallback ? <span className="text-gray-600 text-xs">—</span> : null;
  }
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {patient.is_paused && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Pause className="w-3 h-3" /> Pausado
        </span>
      )}
      {parqNotCleared && (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
          <AlertTriangle className="w-3 h-3" /> PAR-Q
        </span>
      )}
      {criticalConditions.map((d) => (
        <span key={d} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-300 border border-red-500/20">
          {CRITICAL_DISEASE_LABELS[d] || d}
        </span>
      ))}
    </div>
  );
}

function PatientAvatar({ patient, size = "w-9 h-9" }: { patient: PatientProfile; size?: string }) {
  if (patient.photo_url) {
    return <img src={patient.photo_url} alt="" className={`${size} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center flex-shrink-0`}>
      <span className="text-[#00d4ff] font-bold text-sm">{(patient.full_name || "?").charAt(0).toUpperCase()}</span>
    </div>
  );
}

interface RowProps {
  patient: PatientProfile;
  attendance?: PatientAttendance;
  isTeacherView: boolean;
  isAdmin: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

function PatientRow({ patient: p, attendance: att, isTeacherView, isAdmin, onOpen, onDelete }: RowProps) {
  const age = computeAge(p.birth_date);
  const waLink = p.phone ? whatsappLink(p.phone) : "";

  return (
    <tr
      tabIndex={0}
      role="button"
      aria-label={`Ver / editar a ${p.full_name || "este registro"}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`cursor-pointer transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:bg-white/[0.04] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#00d4ff]/60 ${
        p.is_paused ? "opacity-60" : ""
      }`}
    >
      <td className="px-3 py-2.5 pl-4">
        <div className="flex items-center gap-3 min-w-0">
          <PatientAvatar patient={p} />
          <div className="min-w-0">
            <p className="text-white font-semibold font-lexend text-sm truncate max-w-[220px]">{p.full_name || "Sin nombre"}</p>
            {p.email && <p className="text-gray-500 text-xs truncate max-w-[220px]">{p.email}</p>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-gray-300 tabular-nums whitespace-nowrap">{age != null ? `${age} años` : "—"}</td>
      <td className="px-3 py-2.5"><StatusBadges patient={p} /></td>
      {!isTeacherView && (
        <>
          <td className="px-3 py-2.5 text-white font-semibold tabular-nums">{att?.confirmed_count ?? 0}</td>
          <td className="px-3 py-2.5 text-emerald-400 font-semibold tabular-nums">
            {att?.attendance_rate_pct != null ? `${att.attendance_rate_pct}%` : "—"}
          </td>
          <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap">
            {att?.last_attended_session ? new Date(att.last_attended_session).toLocaleDateString() : "—"}
          </td>
        </>
      )}
      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-1.5">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Contactar por WhatsApp"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          )}
          {isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Eliminar"
              className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="p-1.5 rounded-lg text-gray-500" aria-hidden="true">
            <Eye className="w-3.5 h-3.5" />
          </span>
        </div>
      </td>
    </tr>
  );
}

function PatientRowMobile({ patient: p, attendance: att, isTeacherView, isAdmin, onOpen, onDelete }: RowProps) {
  const age = computeAge(p.birth_date);
  const waLink = p.phone ? whatsappLink(p.phone) : "";

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Ver / editar a ${p.full_name || "este registro"}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`px-4 py-3 cursor-pointer transition hover:bg-white/[0.03] focus-visible:outline-none focus-visible:bg-white/[0.04] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#00d4ff]/60 ${
        p.is_paused ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <PatientAvatar patient={p} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-white font-semibold font-lexend text-sm truncate">{p.full_name || "Sin nombre"}</p>
            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {waLink && (
                <a href={waLink} target="_blank" rel="noopener noreferrer" title="Contactar por WhatsApp"
                  className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              )}
              {isAdmin && (
                <button onClick={onDelete} title="Eliminar"
                  className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-0.5 text-xs text-gray-500">
            {p.email && <span className="truncate max-w-[160px]">{p.email}</span>}
            {age != null && <span className="text-gray-400">{age} años</span>}
          </div>
          <div className="empty:hidden mt-1.5">
            <StatusBadges patient={p} emptyFallback={false} />
          </div>
          {!isTeacherView && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-gray-600">
                <span className="text-white font-semibold tabular-nums">{att?.confirmed_count ?? 0}</span> sesiones
              </span>
              <span className="text-gray-600">
                <span className="text-emerald-400 font-semibold tabular-nums">
                  {att?.attendance_rate_pct != null ? `${att.attendance_rate_pct}%` : "—"}
                </span> asistencia
              </span>
              <span className="text-gray-600">
                {att?.last_attended_session ? new Date(att.last_attended_session).toLocaleDateString() : "—"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DesktopSkeletonRows({ showAttendanceCols }: { showAttendanceCols: boolean }) {
  return (
    <div className="hidden lg:block border border-white/[0.06] rounded-xl" aria-hidden="true">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-white/[0.06]">
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i}>
              <td className="px-3 py-2.5 pl-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-32 rounded" />
                    <Skeleton className="h-2.5 w-40 rounded" />
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5"><Skeleton className="h-3 w-10 rounded" /></td>
              <td className="px-3 py-2.5"><Skeleton className="h-3 w-16 rounded" /></td>
              {showAttendanceCols && (
                <>
                  <td className="px-3 py-2.5"><Skeleton className="h-3 w-8 rounded" /></td>
                  <td className="px-3 py-2.5"><Skeleton className="h-3 w-10 rounded" /></td>
                  <td className="px-3 py-2.5"><Skeleton className="h-3 w-16 rounded" /></td>
                </>
              )}
              <td className="px-4 py-2.5" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileSkeletonRows() {
  return (
    <div className="lg:hidden divide-y divide-white/[0.06] border border-white/[0.06] rounded-xl overflow-hidden" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3 rounded" />
            <Skeleton className="h-2.5 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

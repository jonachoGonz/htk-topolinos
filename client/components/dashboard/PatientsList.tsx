import { useEffect, useState, useMemo } from "react";
import { Eye, Search, Pause, Loader2, Trash2, AlertCircle, MessageCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllPatients,
  getAllPatientsAttendance,
  deletePatient,
  computeAge,
  type PatientProfile,
  type PatientAttendance,
} from "@/services/supabase";
import PatientDetailModal from "./PatientDetailModal";

interface PatientsListProps {
  professionalId?: string;
  onAddNote?: (patientId: string) => void;
  onViewProgress?: (patientId: string) => void;
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

export default function PatientsList(_props: PatientsListProps) {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [attendance, setAttendance] = useState<Record<string, PatientAttendance>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showPaused, setShowPaused] = useState(true);
  const [selected, setSelected] = useState<PatientProfile | null>(null);
  const { isAdmin } = useAuth();

  const fetchAll = async () => {
    setLoading(true);
    const [pRes, aRes] = await Promise.all([getAllPatients(), getAllPatientsAttendance()]);
    if (pRes.success) setPatients(pRes.data || []);
    else toast.error(`Error: ${pRes.error}`);
    if (aRes.success) {
      const map: Record<string, PatientAttendance> = {};
      (aRes.data || []).forEach((s) => (map[s.patient_id] = s));
      setAttendance(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

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

      {/* Info banner for admin: signup workflow */}
      {isAdmin && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Para crear un nuevo paciente, debe registrarse primero en{" "}
            <code className="bg-black/30 px-1 rounded">/login</code> (signup). Luego completas su perfil aquí.
          </p>
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

      {selected && (
        <PatientDetailModal
          patientId={selected.id}
          patientName={selected.full_name || "Paciente"}
          isPaused={!!selected.is_paused}
          pauseReason={selected.pause_reason}
          onClose={() => setSelected(null)}
          onChanged={fetchAll}
        />
      )}
    </div>
  );
}

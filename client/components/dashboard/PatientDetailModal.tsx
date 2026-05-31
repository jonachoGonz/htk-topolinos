import { useEffect, useState } from "react";
import { X, StickyNote, Pause, Play, Trash2, Pin, Plus, Loader2, ClipboardList, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  getPatient, getPatientNotes, addPatientNote, deletePatientNote,
  setPatientPause, getPatientAttendance,
  type PatientNote, type PatientAttendance, type PatientProfile,
} from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";
import PatientForm from "./PatientForm";

interface PatientDetailModalProps {
  patientId: string;
  patientName: string;
  isPaused: boolean;
  pauseReason?: string;
  onClose: () => void;
  onChanged: () => void;
}

type Tab = "form" | "notes" | "attendance" | "pause";

const CRITICAL_KEYS = new Set([
  "diabetes_t1", "epilepsia", "cardio", "marcapasos", "embarazo", "cancer",
]);
const CRITICAL_LABELS: Record<string, string> = {
  diabetes_t1: "Diabetes T1",
  epilepsia: "Epilepsia",
  cardio: "Cardiopatía",
  marcapasos: "Marcapasos",
  embarazo: "Embarazo",
  cancer: "Cáncer",
};

export default function PatientDetailModal({
  patientId, patientName, isPaused, pauseReason, onClose, onChanged,
}: PatientDetailModalProps) {
  const [tab, setTab] = useState<Tab>("form");
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    getPatient(patientId).then((r) => {
      if (r.success) setPatient(r.data || null);
    });
  }, [patientId]);

  const criticalConditions = (patient?.diseases || []).filter((d) =>
    CRITICAL_KEYS.has(d)
  );
  const parqNotCleared = patient?.parq_cleared === false;
  const hasAllergies = !!patient?.allergies?.trim();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50" onClick={onClose}>
      <div className="bg-[#0a0e1a] border border-white/10 rounded-xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#0a0e1a] border-b border-white/10 p-4 flex items-start justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white font-montserrat truncate">{patientName}</h3>
            {isPaused && (
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Pause className="w-3 h-3" /> Pausado{pauseReason ? `: ${pauseReason}` : ""}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Critical alerts banner */}
        {(criticalConditions.length > 0 || parqNotCleared || hasAllergies) && (
          <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-200 space-y-0.5 min-w-0 flex-1">
              <p className="font-semibold">⚠ Alertas críticas a considerar</p>
              {parqNotCleared && <p>• PAR-Q indica no apto sin autorización médica</p>}
              {criticalConditions.length > 0 && (
                <p>
                  • Condiciones:{" "}
                  {criticalConditions.map((d) => CRITICAL_LABELS[d] || d).join(", ")}
                </p>
              )}
              {hasAllergies && <p>• Alergias: {patient?.allergies}</p>}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10 px-2 overflow-x-auto">
          <TabBtn active={tab === "form"} onClick={() => setTab("form")}>Datos</TabBtn>
          <TabBtn active={tab === "notes"} onClick={() => setTab("notes")}>
            <StickyNote className="w-3.5 h-3.5" /> Notas
          </TabBtn>
          <TabBtn active={tab === "attendance"} onClick={() => setTab("attendance")}>
            <ClipboardList className="w-3.5 h-3.5" /> Asistencia
          </TabBtn>
          {isAdmin && (
            <TabBtn active={tab === "pause"} onClick={() => setTab("pause")}>
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />} {isPaused ? "Reanudar" : "Pausar"}
            </TabBtn>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {tab === "form" && <PatientForm patientId={patientId} onSaved={onChanged} onCancel={onClose} />}
          {tab === "notes" && <NotesPanel patientId={patientId} />}
          {tab === "attendance" && <AttendancePanel patientId={patientId} />}
          {tab === "pause" && (
            <PausePanel patientId={patientId} isPaused={isPaused} onChanged={() => { onChanged(); onClose(); }} />
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
        active ? "text-[#00d4ff] border-b-2 border-[#00d4ff]" : "text-gray-400 hover:text-white"
      }`}>
      {children}
    </button>
  );
}

function NotesPanel({ patientId }: { patientId: string }) {
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    const r = await getPatientNotes(patientId);
    if (r.success) setNotes(r.data || []);
  };
  useEffect(() => { fetch(); }, [patientId]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setLoading(true);
    const r = await addPatientNote(patientId, content.trim(), pinned);
    if (r.success) { setContent(""); setPinned(false); fetch(); toast.success("Nota agregada"); }
    else toast.error(`Error: ${r.error}`);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    const r = await deletePatientNote(id);
    if (r.success) { fetch(); toast.success("Nota eliminada"); }
    else toast.error(`Error: ${r.error}`);
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
        🔒 Solo visible para profesores y administradores. El paciente no ve estas notas.
      </div>

      <div className="bg-[#0f131a] border border-white/10 rounded-lg p-3 space-y-2">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3}
          placeholder="Escribe una nota sobre el paciente…"
          className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            <Pin className="w-3 h-3" /> Fijar
          </label>
          <button onClick={handleAdd} disabled={loading || !content.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] rounded-lg text-xs font-bold transition disabled:opacity-40">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Agregar nota
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-6">Sin notas aún.</p>
      ) : (
        notes.map((n) => (
          <div key={n.id} className={`p-3 rounded-lg border ${
            n.is_pinned ? "bg-amber-500/5 border-amber-500/20" : "bg-[#0f131a] border-white/10"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-white text-sm whitespace-pre-wrap">{n.content}</p>
                <p className="text-[10px] text-gray-500 mt-2">
                  {n.author?.full_name || "—"} • {new Date(n.created_at).toLocaleString()}
                  {n.is_pinned && <span className="ml-2 text-amber-400"><Pin className="inline w-3 h-3" /> fijada</span>}
                </p>
              </div>
              <button onClick={() => handleDelete(n.id)}
                className="text-red-400 hover:bg-red-500/10 p-1.5 rounded transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AttendancePanel({ patientId }: { patientId: string }) {
  const [stats, setStats] = useState<PatientAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatientAttendance(patientId).then((r) => {
      if (r.success) setStats(r.data || null);
      setLoading(false);
    });
  }, [patientId]);

  if (loading) return <p className="text-center text-gray-500 py-6">Cargando…</p>;
  if (!stats) return <p className="text-center text-gray-500 py-6">Sin datos de asistencia aún.</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Sesiones agendadas" value={String(stats.confirmed_count ?? 0)} />
      <Stat label="Asistió" value={String(stats.attended_count ?? 0)} color="text-emerald-400" />
      <Stat label="Ausente" value={String(stats.absent_count ?? 0)} color="text-red-400" />
      <Stat label="Tasa asistencia" value={stats.attendance_rate_pct != null ? `${stats.attendance_rate_pct}%` : "—"} color="text-[#00d4ff]" />
      <Stat label="Última asistencia" value={stats.last_attended_session ? new Date(stats.last_attended_session).toLocaleString() : "—"} full />
      <Stat label="Próxima clase" value={stats.last_scheduled_session ? new Date(stats.last_scheduled_session).toLocaleString() : "—"} full />
    </div>
  );
}

function Stat({ label, value, color = "text-white", full = false }: any) {
  return (
    <div className={`p-3 rounded-lg bg-[#0f131a] border border-white/10 ${full ? "col-span-2 md:col-span-4" : ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className={`text-lg font-bold font-montserrat mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function PausePanel({ patientId, isPaused, onChanged }: { patientId: string; isPaused: boolean; onChanged: () => void }) {
  const [reason, setReason] = useState("");
  const [resumeAt, setResumeAt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const r = await setPatientPause(patientId, !isPaused, reason || undefined, resumeAt || undefined);
    if (r.success) {
      toast.success(isPaused ? "Paciente reanudado" : "Paciente pausado");
      onChanged();
    } else toast.error(`Error: ${r.error}`);
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className={`p-4 rounded-lg ${
        isPaused ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-200"
                 : "bg-amber-500/10 border border-amber-500/20 text-amber-200"
      }`}>
        {isPaused
          ? "Al reanudar, se reactivará el último plan activo si no ha expirado."
          : "Al pausar, se desactiva el plan activo del alumno. No podrá agendar nuevas clases hasta reanudar."}
      </div>

      {!isPaused && (
        <>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
              Motivo (opcional)
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="Ej: lesión, viaje, decisión personal…"
              className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
              Fecha estimada de reanudación (opcional)
            </label>
            <input type="date" value={resumeAt} onChange={(e) => setResumeAt(e.target.value)}
              className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
          </div>
        </>
      )}

      <button onClick={handleSubmit} disabled={loading}
        className={`w-full py-2.5 rounded-lg font-bold font-lexend transition disabled:opacity-40 flex items-center justify-center gap-2 ${
          isPaused ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                   : "bg-amber-500 hover:bg-amber-400 text-[#05050A]"
        }`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" />
          : isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        {isPaused ? "Reanudar paciente" : "Pausar paciente"}
      </button>
    </div>
  );
}

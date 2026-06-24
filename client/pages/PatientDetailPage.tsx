import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, StickyNote, Pause, ClipboardList, AlertTriangle, LineChart, Briefcase,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getPatient, type PatientProfile } from "@/services/supabase";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";
import BottomNav from "@/components/dashboard/BottomNav";
import PatientForm from "@/components/dashboard/PatientForm";
import EvaluationsPanel from "@/components/dashboard/EvaluationsPanel";
import {
  NotesPanel, AttendancePanel, PausePanel, ProfessionalsPanel,
  CRITICAL_KEYS, CRITICAL_LABELS,
} from "@/components/dashboard/patient-detail/panels";

type Tab = "form" | "notes" | "attendance" | "evaluations" | "professionals" | "pause";
const VALID_TABS: Tab[] = ["form", "notes", "attendance", "evaluations", "professionals", "pause"];

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdmin } = useAuth();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [formDirty, setFormDirty] = useState(false);

  const tabParam = searchParams.get("tab");
  const tab: Tab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "form";

  const refresh = async () => {
    if (!id) return;
    const r = await getPatient(id);
    if (r.success) setPatient(r.data || null);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  if (!id) return null;

  const confirmLeaveIfDirty = () =>
    !formDirty || confirm("Tienes cambios sin guardar. ¿Deseas salir de todas maneras?");

  const handleBack = () => {
    if (!confirmLeaveIfDirty()) return;
    navigate(-1);
  };

  const handleTabClick = (next: Tab) => {
    if (tab === "form" && next !== "form" && !confirmLeaveIfDirty()) return;
    setSearchParams(next === "form" ? {} : { tab: next });
  };

  const criticalConditions = (patient?.diseases || []).filter((d) => CRITICAL_KEYS.has(d));
  const parqNotCleared = patient?.parq_cleared === false;
  const hasAllergies = !!patient?.allergies?.trim();

  return (
    <div className="flex h-screen bg-[#05050A] text-white overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="teacher"
        activeTab="patients"
        onTabChange={(t) => navigate(`/dashboard/teacher?tab=${t}`)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-0">
        <DashboardTopBar
          onMenuToggle={() => setSidebarOpen(true)}
          activeTab="patients"
          onTabChange={(t) => navigate(`/dashboard/teacher?tab=${t}`)}
        />

        <main className="flex-1 overflow-y-auto bg-[#0a0e1a] px-5 pt-5 lg:px-6 lg:pt-6 pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-white font-montserrat">
                  {patient?.full_name || "Paciente"}
                </h1>
                {patient?.is_paused && (
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Pause className="w-3 h-3" /> Pausado{patient?.pause_reason ? `: ${patient.pause_reason}` : ""}
                  </div>
                )}
              </div>
            </div>

            {(criticalConditions.length > 0 || parqNotCleared || hasAllergies) && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 flex items-start gap-2">
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

            <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
              <TabBtn active={tab === "form"} onClick={() => handleTabClick("form")}>Datos</TabBtn>
              <TabBtn active={tab === "notes"} onClick={() => handleTabClick("notes")}>
                <StickyNote className="w-3.5 h-3.5" /> Notas
              </TabBtn>
              <TabBtn active={tab === "attendance"} onClick={() => handleTabClick("attendance")}>
                <ClipboardList className="w-3.5 h-3.5" /> Asistencia
              </TabBtn>
              <TabBtn active={tab === "evaluations"} onClick={() => handleTabClick("evaluations")}>
                <LineChart className="w-3.5 h-3.5" /> Evaluaciones
              </TabBtn>
              {isAdmin && (
                <TabBtn active={tab === "professionals"} onClick={() => handleTabClick("professionals")}>
                  <Briefcase className="w-3.5 h-3.5" /> Profesionales
                </TabBtn>
              )}
              {isAdmin && (
                <TabBtn active={tab === "pause"} onClick={() => handleTabClick("pause")}>
                  <Pause className="w-3.5 h-3.5" /> {patient?.is_paused ? "Reanudar" : "Pausar"}
                </TabBtn>
              )}
            </div>

            <div>
              {tab === "form" && (
                <PatientForm
                  patientId={id}
                  onSaved={refresh}
                  onCancel={() => navigate(-1)}
                  onDirtyChange={setFormDirty}
                />
              )}
              {tab === "notes" && <NotesPanel patientId={id} />}
              {tab === "attendance" && <AttendancePanel patientId={id} />}
              {tab === "evaluations" && <EvaluationsPanel patientId={id} />}
              {tab === "professionals" && isAdmin && <ProfessionalsPanel patientId={id} />}
              {tab === "pause" && isAdmin && (
                <PausePanel
                  patientId={id}
                  isPaused={!!patient?.is_paused}
                  onChanged={() => { refresh(); navigate(-1); }}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <BottomNav userRole="teacher" activeTab="patients" onTabChange={(t) => navigate(`/dashboard/teacher?tab=${t}`)} />
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

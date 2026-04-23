import { useState, useMemo } from "react";
import { TrendingUp, AlertTriangle, CalendarClock, Search, ListChecks, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";
import UserRow, { type AttendanceStatus, type Patient } from "@/components/dashboard/UserRow";

// ─── Helpers ─────────────────────────────────────────────────────────
function getFormattedDate() {
  const today = new Date();
  const months = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  return `${today.getDate()} de ${months[today.getMonth()]}, ${today.getFullYear()}`;
}

// ─── Mock patient data ────────────────────────────────────────────────
const INITIAL_PATIENTS: Patient[] = [
  {
    id: "p1",
    name: "Ana Martínez",
    studentId: "#4402",
    diagnosis: "Post-cirugía hombro",
    status: "confirmed",
    initials: "AM",
    avatarColor: "#1e40af",
    online: true,
  },
  {
    id: "p2",
    name: "Carlos Ruiz",
    studentId: "#4415",
    diagnosis: "Recuperación LCA",
    status: "absent",
    initials: "CR",
    avatarColor: "#1e3a5f",
    online: false,
  },
  {
    id: "p3",
    name: "Lucía Vargas",
    studentId: "#4433",
    alert: "3 ausencias seguidas (Alerta)",
    status: "pending",
    initials: "LV",
    avatarColor: "#27272a",
    online: false,
  },
  {
    id: "p4",
    name: "Diego Fernández",
    studentId: "#4429",
    diagnosis: "Tendinopatía Aquiles",
    status: "confirmed",
    initials: "DF",
    avatarColor: "#164e63",
    online: true,
  },
];

// ─── Stat Card ───────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendPositive?: boolean;
  icon?: React.ReactNode;
  wide?: boolean;
}

function StatCard({ label, value, unit, trend, trendPositive, icon, wide }: StatCardProps) {
  return (
    <div className={`bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 flex flex-col justify-between gap-4 ${wide ? "col-span-1 md:col-span-2 lg:col-span-1" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs font-inter uppercase tracking-wider mb-2">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white font-montserrat leading-none">{value}</span>
            {unit && <span className="text-gray-400 text-sm font-inter">{unit}</span>}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-inter ${trendPositive ? "text-emerald-400" : "text-rose-400"}`}>
              <TrendingUp className="w-3 h-3" />
              {trend}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-[#00d4ff]/20">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Teacher Dashboard Page ───────────────────────────────────────────
export default function TeacherDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [search, setSearch] = useState("");

  const filteredPatients = useMemo(() => {
    const q = search.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.studentId.toLowerCase().includes(q) ||
        (p.diagnosis ?? "").toLowerCase().includes(q)
    );
  }, [patients, search]);

  const confirmedCount = patients.filter((p) => p.status === "confirmed").length;
  const absentAlerts = patients.filter((p) => p.status === "absent" || p.alert).length;

  const handleStatusChange = (id: string, status: AttendanceStatus) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
  };

  const handleDismiss = (id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    toast("Paciente removido de la sesión.");
  };

  const handleSaveDraft = () => toast.success("Borrador guardado correctamente.");
  const handleFinish = () => toast.success("Sesión finalizada. ¡Hasta pronto!");

  return (
    <div className="flex h-screen bg-[#05050A] text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-0">
        {/* Top bar */}
        <DashboardTopBar onMenuToggle={() => setSidebarOpen(true)} />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0e1a] p-5 lg:p-6">
          {/* ── Session header ─────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white font-montserrat leading-tight">
                Pase de Lista
              </h1>
              <p className="text-gray-400 text-sm font-inter mt-1">
                Sesión: 07:00 a 08:30 AM
              </p>
            </div>

            <div className="flex items-start gap-4">
              <div className="text-right">
                <p className="text-[10px] text-gray-500 font-inter uppercase tracking-widest">
                  FECHA DE HOY
                </p>
                <p className="text-[#0ea5e9] text-sm font-semibold font-lexend mt-0.5">
                  {getFormattedDate()}
                </p>
              </div>
              <div className="bg-[#0f131a] border border-white/10 rounded-lg px-3 py-2 text-center">
                <span className="text-xs text-gray-400 font-inter">Asistencia: </span>
                <span className="text-[#00d4ff] font-bold font-lexend">{confirmedCount}</span>
                <span className="text-white font-bold font-lexend">/{patients.length}</span>
              </div>
            </div>
          </div>

          {/* ── Stats grid ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Ratio de Asistencia Semanal"
              value="94%"
              trend="+2.4% vs semana pasada"
              trendPositive
              icon={<TrendingUp className="w-10 h-10" />}
            />
            <StatCard
              label="Alertas de Ausencia"
              value={String(absentAlerts)}
              unit="estudiantes"
              icon={<AlertTriangle className="w-10 h-10" />}
            />
            <StatCard
              label="Sesiones Restantes"
              value="08"
              unit="del ciclo"
              icon={<CalendarClock className="w-10 h-10" />}
            />
          </div>

          {/* ── User list card ─────────────────────────────────── */}
          <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <ListChecks className="w-5 h-5 text-[#00d4ff]" />
                <span className="text-white font-semibold font-lexend text-sm">
                  Lista de Usuarios
                </span>
              </div>
              {/* Search */}
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-600 font-inter focus:outline-none focus:border-[#00d4ff]/40 transition"
                />
              </div>
            </div>

            {/* User list */}
            <div className="px-5 divide-y divide-white/[0.04]">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <UserRow
                    key={patient.id}
                    patient={patient}
                    onStatusChange={handleStatusChange}
                    onDismiss={handleDismiss}
                  />
                ))
              ) : (
                <div className="py-10 text-center text-gray-600 text-sm font-inter">
                  No se encontraron pacientes.
                </div>
              )}
            </div>

            {/* Card footer */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-t border-white/[0.06]">
              <p className="text-gray-600 text-xs font-inter">
                Mostrando {filteredPatients.length} de {patients.length} pacientes asignados a esta sesión
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveDraft}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold font-lexend text-gray-300 border border-white/10 rounded-lg hover:bg-white/5 transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  Guardar Borrador
                </button>
                <button
                  onClick={handleFinish}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold font-lexend bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg transition shadow-[0_0_12px_rgba(2,132,199,0.25)]"
                >
                  Finalizar Sesión
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => toast("Crear nuevo usuario")}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(249,115,22,0.4)] transition-all hover:scale-105 active:scale-95"
        aria-label="Nuevo usuario"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}

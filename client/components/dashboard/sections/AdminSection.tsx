import { useState } from "react";
import { Shield, Users, Package, UserCheck, BarChart3, Settings, Briefcase } from "lucide-react";
import PatientsList from "@/components/dashboard/PatientsList";
import AdminPlansManager from "@/components/admin/AdminPlansManager";
import AdminPlanAssignment from "@/components/admin/AdminPlanAssignment";
import AdminReports from "@/components/admin/AdminReports";
import AdminSettings from "@/components/admin/AdminSettings";

type AdminTab = "reports" | "students" | "teachers" | "plans" | "assignments" | "settings";

const VALID_ADMIN_TABS: AdminTab[] = ["reports", "students", "teachers", "plans", "assignments", "settings"];

const TABS: { value: AdminTab; label: string; icon: any }[] = [
  { value: "reports",     label: "Reportes",        icon: BarChart3 },
  { value: "students",    label: "Alumnos",         icon: Users },
  { value: "teachers",    label: "Profesionales",   icon: Briefcase },
  { value: "plans",       label: "Planes",          icon: Package },
  { value: "assignments", label: "Asignar planes",  icon: UserCheck },
  { value: "settings",    label: "Configuración",   icon: Settings },
];

// Lee el sub-tab inicial desde ?admintab= en la URL (permite deep-link, ej.
// desde el botón "Volver" de TeacherDetailPage hacia Administración → Profesionales).
// Igual que TeacherDashboard hace con su propio ?tab=, solo se lee al montar.
function initialAdminTab(): AdminTab {
  const v = new URLSearchParams(window.location.search).get("admintab");
  return VALID_ADMIN_TABS.includes(v as AdminTab) ? (v as AdminTab) : "reports";
}

export default function AdminSection() {
  const [tab, setTab] = useState<AdminTab>(initialAdminTab);

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <Shield className="w-6 h-6 text-[#00d4ff] mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Administración
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Gestión del centro: reportes, alumnos, planes, asignaciones y configuración
          </p>
        </div>
      </div>

      {/* Tabs (scrollable horizontal on mobile) */}
      <div className="flex gap-2 mb-6 border-b border-white/[0.06] overflow-x-auto -mx-5 px-5">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm whitespace-nowrap transition ${
                tab === t.value
                  ? "text-[#00d4ff] border-b-2 border-[#00d4ff]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "reports"     && <AdminReports />}
      {tab === "students"    && <PatientsList roleFilter="student" />}
      {tab === "teachers"    && <PatientsList roleFilter="teacher" />}
      {tab === "plans"       && <AdminPlansManager />}
      {tab === "assignments" && <AdminPlanAssignment />}
      {tab === "settings"    && <AdminSettings />}
    </div>
  );
}

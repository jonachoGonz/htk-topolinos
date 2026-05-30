import { useState } from "react";
import { Shield, Users, Package, UserCheck } from "lucide-react";
import StudentsList from "@/components/dashboard/StudentsList";
import AdminPlansManager from "@/components/admin/AdminPlansManager";
import AdminPlanAssignment from "@/components/admin/AdminPlanAssignment";

type AdminTab = "students" | "plans" | "assignments";

const TABS: { value: AdminTab; label: string; icon: any }[] = [
  { value: "students", label: "Alumnos", icon: Users },
  { value: "plans", label: "Planes", icon: Package },
  { value: "assignments", label: "Asignar planes", icon: UserCheck },
];

export default function AdminSection() {
  const [tab, setTab] = useState<AdminTab>("students");

  const handleViewStudentDetails = (studentId: string) => {
    console.log("View student details:", studentId);
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <Shield className="w-6 h-6 text-[#00d4ff] mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Administración
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Gestión de estudiantes, planes y asignaciones
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-white/[0.06]">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm transition ${
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

      {tab === "students" && <StudentsList onViewDetails={handleViewStudentDetails} />}
      {tab === "plans" && <AdminPlansManager />}
      {tab === "assignments" && <AdminPlanAssignment />}
    </div>
  );
}

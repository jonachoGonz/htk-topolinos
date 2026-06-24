import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";
import BottomNav from "@/components/dashboard/BottomNav";
import TeacherProfileForm from "@/components/dashboard/TeacherProfileForm";

export default function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formDirty, setFormDirty] = useState(false);

  if (!id) return null;

  const handleBack = () => {
    if (formDirty && !confirm("Tienes cambios sin guardar. ¿Deseas salir de todas maneras?")) return;
    navigate(-1);
  };

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

            <h1 className="text-lg font-bold text-white font-montserrat">Profesional</h1>

            <TeacherProfileForm teacherId={id} onDirtyChange={setFormDirty} />
          </div>
        </main>
      </div>

      <BottomNav userRole="teacher" activeTab="patients" onTabChange={(t) => navigate(`/dashboard/teacher?tab=${t}`)} />
    </div>
  );
}

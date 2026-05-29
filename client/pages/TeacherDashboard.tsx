import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";
import DashboardSection from "@/components/dashboard/sections/DashboardSection";
import CalendarSection from "@/components/dashboard/sections/CalendarSection";
import PatientsSection from "@/components/dashboard/sections/PatientsSection";
import ProfileSection from "@/components/dashboard/sections/ProfileSection";
import AdminSection from "@/components/dashboard/sections/AdminSection";

export default function TeacherDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const { user } = useAuth();

  const handleNewUser = () => {
    toast("Crear nuevo usuario");
  };

  return (
    <div className="flex h-screen bg-[#05050A] text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-0">
        {/* Top bar */}
        <DashboardTopBar onMenuToggle={() => setSidebarOpen(true)} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0e1a] p-5 lg:p-6">
          {activeTab === "dashboard" && <DashboardSection />}
          {activeTab === "calendar" && <CalendarSection professionalId={user?.id || ""} />}
          {activeTab === "patients" && <PatientsSection professionalId={user?.id || ""} />}
          {activeTab === "profile" && <ProfileSection />}
          {activeTab === "admin" && user?.is_admin && <AdminSection />}
        </main>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleNewUser}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(249,115,22,0.4)] transition-all hover:scale-105 active:scale-95"
        aria-label="Nuevo usuario"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}

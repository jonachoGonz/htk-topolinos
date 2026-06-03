import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/dashboard/Sidebar";
import BottomNav from "@/components/dashboard/BottomNav";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";
import DashboardSection from "@/components/dashboard/sections/DashboardSection";
import CalendarSection from "@/components/dashboard/sections/CalendarSection";
import PatientsSection from "@/components/dashboard/sections/PatientsSection";
import ProfileSection from "@/components/dashboard/sections/ProfileSection";
import AdminSection from "@/components/dashboard/sections/AdminSection";
import MessagingPanel from "@/components/dashboard/MessagingPanel";

export default function TeacherDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initialTab = (() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("tab") || "dashboard";
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const { user, isAdmin } = useAuth();

  return (
    <div className="flex h-screen bg-[#05050A] text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="teacher"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-0">
        {/* Top bar */}
        <DashboardTopBar onMenuToggle={() => setSidebarOpen(true)} activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0e1a] px-5 pt-5 lg:px-6 lg:pt-6 pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-6">
          {activeTab === "dashboard" && <DashboardSection onNavigate={setActiveTab} />}
          {activeTab === "calendar" && <CalendarSection professionalId={user?.id || ""} />}
          {activeTab === "patients" && <PatientsSection professionalId={user?.id || ""} />}
          {activeTab === "messages" && <MessagingPanel />}
          {activeTab === "profile" && <ProfileSection />}
          {activeTab === "admin" && isAdmin && <AdminSection />}
        </main>
      </div>

      <BottomNav userRole="teacher" activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

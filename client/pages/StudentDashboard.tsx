import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/dashboard/Sidebar";
import BottomNav from "@/components/dashboard/BottomNav";
import StudentTopBar from "@/components/dashboard/StudentTopBar";
import StudentDashboardSection from "@/components/dashboard/sections/StudentDashboardSection";
import StudentCalendarSection from "@/components/dashboard/sections/StudentCalendarSection";
import StudentPaymentSection from "@/components/dashboard/sections/StudentPaymentSection";
import StudentSettingsSection from "@/components/dashboard/sections/StudentSettingsSection";
import OnboardingWizard from "@/components/dashboard/OnboardingWizard";
import MessagingPanel from "@/components/dashboard/MessagingPanel";
import { getOnboardingState } from "@/services/supabase";

export default function StudentDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initialTab = (() => {
    const p = new URLSearchParams(window.location.search);
    return p.get("tab") || "dashboard";
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    getOnboardingState(user.id).then((r) => {
      if (r.success && r.data) setNeedsOnboarding(!r.data.completed);
    });
  }, [user?.id]);

  return (
    <div className="flex h-screen bg-[#05050A] text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="student"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-0">
        {/* Top bar */}
        <StudentTopBar
          onMenuToggle={() => setSidebarOpen(true)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto bg-[#0a0e1a] p-5 lg:p-6 htk-bottom-safe lg:!pb-6">
          {activeTab === "dashboard" && <StudentDashboardSection />}
          {activeTab === "calendario" && <StudentCalendarSection studentId={user?.id || ""} />}
          {activeTab === "messages" && <MessagingPanel />}
          {activeTab === "pagos" && <StudentPaymentSection studentId={user?.id || ""} />}
          {activeTab === "configuracion" && <StudentSettingsSection />}
        </main>
      </div>

      <BottomNav userRole="student" activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Onboarding wizard — blocks usage until profile + PAR-Q complete */}
      {needsOnboarding && user?.id && (
        <OnboardingWizard
          userId={user.id}
          onComplete={() => setNeedsOnboarding(false)}
        />
      )}
    </div>
  );
}

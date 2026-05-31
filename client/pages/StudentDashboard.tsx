import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/dashboard/Sidebar";
import StudentTopBar from "@/components/dashboard/StudentTopBar";
import StudentDashboardSection from "@/components/dashboard/sections/StudentDashboardSection";
import StudentCalendarSection from "@/components/dashboard/sections/StudentCalendarSection";
import StudentPaymentSection from "@/components/dashboard/sections/StudentPaymentSection";
import StudentSettingsSection from "@/components/dashboard/sections/StudentSettingsSection";
import OnboardingWizard from "@/components/dashboard/OnboardingWizard";
import { getOnboardingState } from "@/services/supabase";

export default function StudentDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    getOnboardingState(user.id).then((r) => {
      if (r.success && r.data) setNeedsOnboarding(!r.data.completed);
    });
  }, [user?.id]);

  const handleNewBooking = () => {
    toast("Ir a calendario para crear una nueva sesión");
    setActiveTab("calendario");
  };

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
        <main className="flex-1 overflow-y-auto bg-[#0a0e1a] p-5 lg:p-6">
          {activeTab === "dashboard" && <StudentDashboardSection />}
          {activeTab === "calendario" && <StudentCalendarSection studentId={user?.id || ""} />}
          {activeTab === "pagos" && <StudentPaymentSection studentId={user?.id || ""} />}
          {activeTab === "configuracion" && <StudentSettingsSection />}
        </main>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleNewBooking}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(249,115,22,0.4)] transition-all hover:scale-105 active:scale-95"
        aria-label="Nueva sesión"
      >
        <Plus className="w-5 h-5" />
      </button>

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

import { UserCircle, Menu } from "lucide-react";
import NotificationBell from "./NotificationBell";

interface DashboardTopBarProps {
  onMenuToggle: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const tabLabels = {
  dashboard: "Panel",
  calendar: "Calendario",
  patients: "Pacientes",
  profile: "Mi Perfil",
  admin: "Administración",
};

const visibleTabs = ["dashboard", "calendar", "patients", "profile"];

export default function DashboardTopBar({ onMenuToggle, activeTab = "dashboard", onTabChange }: DashboardTopBarProps) {
  return (
    <header className="sticky top-0 z-10 bg-[#0a0e1a]/90 backdrop-blur-md border-b border-white/[0.06] px-5 py-3 flex items-center justify-between gap-4">
      {/* Left: hamburger (mobile) + title + tabs */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-gray-400 hover:text-white transition flex-shrink-0"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title */}
        <span className="text-sm font-medium font-lexend whitespace-nowrap">
          <span className="text-white">HTK Center - </span>
          <span className="text-[#00d4ff]">Plataforma Profesor</span>
        </span>

        {/* Nav tabs */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange?.(tab)}
              className={`px-3 py-1.5 text-sm font-medium font-lexend rounded transition-all ${
                activeTab === tab
                  ? "text-[#00d4ff] border-b-2 border-[#00d4ff] rounded-none"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tabLabels[tab as keyof typeof tabLabels]}
            </button>
          ))}
        </nav>
      </div>

      {/* Right: icons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <NotificationBell />
        <button
          onClick={() => onTabChange?.("profile")}
          aria-label="Ir a mi perfil"
          title="Mi perfil"
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5"
        >
          <UserCircle className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}

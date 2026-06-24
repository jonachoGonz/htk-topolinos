import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/services/supabase";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  CreditCard,
  Settings,
  LogOut,
  UserCircle,
  Shield,
  MessageSquare,
  X,
} from "lucide-react";

type NavItem = {
  icon: React.ElementType;
  label: string;
  tabId: string;
};

const teacherNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Panel",        tabId: "dashboard" },
  { icon: CalendarDays,    label: "Calendario",   tabId: "calendar"  },
  { icon: Users,           label: "Pacientes",    tabId: "patients"  },
  { icon: MessageSquare,   label: "Mensajes",     tabId: "messages"  },
  { icon: UserCircle,      label: "Mi Perfil",    tabId: "profile"   },
];

const adminNavItem: NavItem = {
  icon: Shield, label: "Administración", tabId: "admin",
};

const studentNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Panel",          tabId: "dashboard"    },
  { icon: CalendarDays,    label: "Calendario",     tabId: "calendario"   },
  { icon: MessageSquare,   label: "Mensajes",       tabId: "messages"     },
  { icon: CreditCard,      label: "Pagos",          tabId: "pagos"        },
  { icon: Settings,        label: "Configuración",  tabId: "configuracion"},
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: "teacher" | "student";
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  userRole = "teacher",
  activeTab = "dashboard",
  onTabChange,
}: SidebarProps) {
  const navigate = useNavigate();
  const { signOut, isAdmin, user } = useAuth();
  const [profileName, setProfileName] = useState<string | null>(null);

  // Cargar full_name desde profiles. user.user_metadata.full_name a veces
  // no está poblado para cuentas viejas; profiles.full_name es la fuente
  // de verdad y la actualiza el alumno/admin al editar perfil.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled && data?.full_name) setProfileName(data.full_name);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const displayName =
    profileName ||
    (user?.user_metadata as { full_name?: string } | null)?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario";
  const initials = displayName
    .split(/\s+/)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = userRole === "student"
    ? "Alumno"
    : isAdmin
    ? "Administrador"
    : "Profesional";

  const baseItems = userRole === "student" ? studentNavItems : teacherNavItems;
  const navItems =
    userRole !== "student" && isAdmin ? [...baseItems, adminNavItem] : baseItems;
  const brandSubtext = userRole === "student"
    ? "PORTAL ALUMNO"
    : isAdmin
    ? "PORTAL ADMIN"
    : "PORTAL PROFESOR";

  const handleTabClick = (tabId: string) => {
    onTabChange?.(tabId);
    onClose(); // cierra el menú en móvil
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile backdrop — z above BottomNav so the nav is dimmed too */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen w-60 z-50 flex flex-col
          bg-[#05050A] border-r border-white/[0.06]
          transition-transform duration-200 ease-in-out
          lg:relative lg:w-56 lg:translate-x-0 lg:flex-shrink-0 lg:z-30
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <img
              src="/brand/logo.svg"
              alt="HTK Center"
              className="h-6 w-auto"
            />
            <div className="text-gray-500 text-[9px] tracking-[0.12em] uppercase font-lexend mt-1">
              {brandSubtext}
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-600 hover:text-gray-300 transition"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 space-y-0.5">
            {navItems.map(({ icon: Icon, label, tabId }) => {
              const active = activeTab === tabId;
              return (
                <button
                  key={tabId}
                  onClick={() => handleTabClick(tabId)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-lexend
                    transition-all duration-200 ease-out group relative text-left
                    active:scale-[0.98]
                    ${active
                      ? "text-[#00d4ff] bg-[#00d4ff]/[0.08]"
                      : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                    }
                  `}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#00d4ff] rounded-r-full" />
                  )}
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      active ? "text-[#00d4ff]" : "text-gray-600 group-hover:text-gray-300"
                    }`}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom — user + logout. Extra pb on mobile for iOS safe-area. */}
        <div className="px-4 pt-3 border-t border-white/[0.06] space-y-2 pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:pb-5">
          {/* User identity chip */}
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.03]">
            <div className="w-8 h-8 rounded-full bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate font-lexend">
                {displayName}
              </div>
              <div className="text-[9px] uppercase tracking-[0.12em] text-gray-500 mt-0.5">
                {roleLabel}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full text-gray-500 hover:text-rose-400 text-sm transition-colors px-2 py-2 rounded-lg hover:bg-rose-500/[0.06] font-lexend active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}

import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Plus,
  X,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: CalendarDays, label: "Calendario", path: "/dashboard/calendario" },
  { icon: Users, label: "Pacientes", path: "/dashboard/pacientes" },
  { icon: CreditCard, label: "Pagos", path: "/dashboard/pagos" },
  { icon: Settings, label: "Configuración", path: "/dashboard/configuracion" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();

  const isActive = (path: string) =>
    path === "/dashboard"
      ? location.pathname === "/dashboard" ||
        location.pathname === "/dashboard/teacher"
      : location.pathname.startsWith(path);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-56 z-30 flex flex-col
          bg-[#05050A] border-r border-white/[0.06]
          transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0 lg:flex-shrink-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Brand header */}
        <div className="px-5 py-5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* HTK icon */}
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-[#00d4ff] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.575 8.15L18.525 6.1L18.875 5.725L16.3 3.15L15.925 3.5L13.875 1.45L14.6.7C15.0667.233 15.6208 0 16.2625 0C16.9042 0 17.4583.233 17.925.7L21.3 4.05C21.7667 4.517 22 5.075 22 5.725C22 6.375 21.7667 6.933 21.3 7.4L20.575 8.15ZM8.4 20.325C7.9333 20.792 7.3708 21.025 6.7125 21.025C6.0542 21.025 5.4917 20.792 5.025 20.325L1.7 16.975C1.2333 16.508 1 15.95 1 15.3C1 14.65 1.2333 14.092 1.7 13.625L2.425 12.9L4.475 14.95L4.125 15.325L6.7 17.9L7.075 17.55L9.125 19.6L8.4 20.325ZM12.875 20C12.4083 20.467 11.85 20.7 11.2 20.7C10.55 20.7 9.9917 20.467 9.525 20L2 12.475C1.5333 12.008 1.3042 11.454 1.3125 10.8125C1.3208 10.171 1.5583 9.617 2.025 9.15L3.5 7.675C3.9667 7.208 4.5208 6.975 5.1625 6.975C5.8042 6.975 6.3583 7.208 6.825 7.675L8 8.875L9.825 7.05L8.625 5.85C8.1583 5.383 7.9292 4.829 7.9375 4.1875C7.9458 3.546 8.1833 2.992 8.65 2.525L10.15 1.025C10.6167.558 11.1667.325 11.8.325C12.4333.325 12.9833.558 13.45 1.025L20.975 8.55C21.4417 9.017 21.6792 9.571 21.6875 10.2125C21.6958 10.854 21.4667 11.408 21 11.875L19.5 13.375C19.0333 13.842 18.475 14.075 17.825 14.075C17.175 14.075 16.6167 13.842 16.15 13.375L14.975 12.2L13.15 14.025L14.325 15.2C14.7917 15.667 15.0292 16.221 15.0375 16.8625C15.0458 17.504 14.8167 18.058 14.35 18.525L12.875 20Z" fill="#0A0F1A"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-sm font-lexend leading-tight">
                HTK panel
              </div>
              <div className="text-gray-500 text-[9px] tracking-[0.12em] uppercase font-lexend mt-0.5">
                ADMIN CENTRAL
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-600 hover:text-gray-300 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 space-y-0.5">
            {navItems.map(({ icon: Icon, label, path }) => {
              const active = isActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium font-lexend
                    transition-all duration-150 group relative
                    ${
                      active
                        ? "text-[#00d4ff] bg-[#00d4ff]/[0.07]"
                        : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                    }
                  `}
                >
                  {/* Active indicator */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#00d4ff] rounded-r-full" />
                  )}
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${active ? "text-[#00d4ff]" : "text-gray-600 group-hover:text-gray-300"}`}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom actions */}
        <div className="px-4 pb-5 pt-3 border-t border-white/[0.06] space-y-2">
          <button className="w-full flex items-center justify-center gap-2 bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] text-sm font-bold py-2.5 rounded-xl transition font-lexend">
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
          <button className="flex items-center gap-2.5 w-full text-gray-500 hover:text-gray-200 text-sm transition px-2 py-2 rounded-lg hover:bg-white/[0.03] font-lexend">
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}

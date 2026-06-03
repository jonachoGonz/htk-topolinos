import {
  LayoutDashboard,
  CalendarDays,
  Users,
  CreditCard,
  Settings,
  UserCircle,
  MessageSquare,
} from "lucide-react";

type Item = { icon: React.ElementType; label: string; tabId: string };

const teacherItems: Item[] = [
  { icon: LayoutDashboard, label: "Panel",      tabId: "dashboard" },
  { icon: CalendarDays,    label: "Agenda",     tabId: "calendar"  },
  { icon: Users,           label: "Pacientes",  tabId: "patients"  },
  { icon: MessageSquare,   label: "Mensajes",   tabId: "messages"  },
  { icon: UserCircle,      label: "Perfil",     tabId: "profile"   },
];

const studentItems: Item[] = [
  { icon: LayoutDashboard, label: "Panel",     tabId: "dashboard"    },
  { icon: CalendarDays,    label: "Agenda",    tabId: "calendario"   },
  { icon: MessageSquare,   label: "Mensajes",  tabId: "messages"     },
  { icon: CreditCard,      label: "Pagos",     tabId: "pagos"        },
  { icon: Settings,        label: "Ajustes",   tabId: "configuracion"},
];

interface Props {
  userRole?: "teacher" | "student";
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function BottomNav({ userRole = "teacher", activeTab, onTabChange }: Props) {
  const items = userRole === "student" ? studentItems : teacherItems;

  return (
    <nav
      className="
        lg:hidden fixed bottom-0 inset-x-0 z-40
        bg-[#05050A]/95 backdrop-blur-md border-t border-white/[0.08]
        pb-[env(safe-area-inset-bottom)]
      "
      aria-label="Navegación principal"
    >
      <ul className="grid grid-cols-5 gap-0.5 px-1.5 pt-1.5 pb-1">
        {items.map(({ icon: Icon, label, tabId }) => {
          const active = activeTab === tabId;
          return (
            <li key={tabId}>
              <button
                onClick={() => onTabChange(tabId)}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={`
                  w-full flex flex-col items-center justify-center gap-1
                  px-1 py-2 rounded-lg
                  transition-all duration-150
                  ${active
                    ? "text-cyan-400"
                    : "text-gray-500 hover:text-gray-200 active:scale-95"
                  }
                `}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? "text-cyan-400" : ""}`} strokeWidth={active ? 2.4 : 1.8} />
                  {active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
                  )}
                </div>
                <span className={`text-[10px] font-medium leading-none ${active ? "font-semibold" : ""}`}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

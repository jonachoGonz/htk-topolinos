import { useState } from "react";
import { CalendarClock } from "lucide-react";
import AgendaView from "@/components/dashboard/AgendaView";
import AvailabilityManager from "@/components/dashboard/AvailabilityManager";
import HolidayManager from "@/components/dashboard/HolidayManager";

interface CalendarSectionProps {
  professionalId: string;
}

type Tab = "agenda" | "availability" | "holidays";

const TABS: { value: Tab; label: string }[] = [
  { value: "agenda",       label: "Agenda" },
  { value: "availability", label: "Disponibilidades" },
  { value: "holidays",     label: "Vacaciones" },
];

export default function CalendarSection({ professionalId }: CalendarSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("agenda");

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <CalendarClock className="w-6 h-6 text-[#00d4ff] mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Calendario
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Tu agenda del día, semana o mes · gestión de disponibilidad · vacaciones
          </p>
        </div>
      </div>

      {/* Tabs — horizontal scroll on mobile */}
      <div className="flex gap-1 mb-6 border-b border-white/[0.06] overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0">
        {TABS.map((t) => {
          const active = activeTab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`
                relative px-4 py-2 font-semibold text-sm whitespace-nowrap transition
                ${active ? "text-cyan-400" : "text-gray-400 hover:text-white"}
              `}
            >
              {t.label}
              {active && (
                <span className="absolute -bottom-px left-3 right-3 h-0.5 bg-cyan-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "agenda" && (
        <AgendaView professionalId={professionalId} />
      )}
      {activeTab === "availability" && (
        <AvailabilityManager professionalId={professionalId} />
      )}
      {activeTab === "holidays" && (
        <HolidayManager professionalId={professionalId} />
      )}
    </div>
  );
}

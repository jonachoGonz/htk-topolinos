import { useState } from "react";
import { CalendarClock, Tabs } from "lucide-react";
import AvailabilityManager from "@/components/dashboard/AvailabilityManager";
import HolidayManager from "@/components/dashboard/HolidayManager";

interface CalendarSectionProps {
  professionalId: string;
}

export default function CalendarSection({ professionalId }: CalendarSectionProps) {
  const [activeTab, setActiveTab] = useState<"availability" | "holidays">("availability");

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <CalendarClock className="w-6 h-6 text-[#00d4ff] mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Calendario y Disponibilidad
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Gestiona tus horarios disponibles y períodos de vacaciones
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab("availability")}
          className={`px-4 py-2 font-semibold text-sm transition ${
            activeTab === "availability"
              ? "text-[#00d4ff] border-b-2 border-[#00d4ff]"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Disponibilidades
        </button>
        <button
          onClick={() => setActiveTab("holidays")}
          className={`px-4 py-2 font-semibold text-sm transition ${
            activeTab === "holidays"
              ? "text-[#00d4ff] border-b-2 border-[#00d4ff]"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Vacaciones
        </button>
      </div>

      {/* Content */}
      {activeTab === "availability" && (
        <AvailabilityManager professionalId={professionalId} />
      )}
      {activeTab === "holidays" && (
        <HolidayManager professionalId={professionalId} />
      )}
    </div>
  );
}

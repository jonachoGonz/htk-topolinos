import { CalendarClock } from "lucide-react";
import AvailabilityManager from "@/components/dashboard/AvailabilityManager";

interface CalendarSectionProps {
  professionalId: string;
}

export default function CalendarSection({ professionalId }: CalendarSectionProps) {
  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <CalendarClock className="w-6 h-6 text-[#00d4ff] mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Calendario y Disponibilidad
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Gestiona tus horarios disponibles para clientes
          </p>
        </div>
      </div>

      <AvailabilityManager professionalId={professionalId} />
    </div>
  );
}

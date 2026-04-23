import { Clock } from "lucide-react";
import { toast } from "sonner";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  userBooked: boolean;
}

interface SlotCardProps {
  slot: TimeSlot;
  onBook: (slotId: string) => void;
  onCancel: (slotId: string) => void;
}

function ProgressBar({ booked, capacity }: { booked: number; capacity: number }) {
  const pct = Math.round((booked / capacity) * 100);
  const isFull = booked >= capacity;
  const isEmpty = booked === 0;

  return (
    <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mt-2">
      {!isEmpty && (
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isFull ? "bg-zinc-500" : "bg-amber-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}

export default function SlotCard({ slot, onBook, onCancel }: SlotCardProps) {
  const { id, startTime, endTime, capacity, booked, userBooked } = slot;
  const isFull = booked >= capacity;
  const available = !isFull && !userBooked;

  const cuposColor = userBooked
    ? "text-[#00d4ff]"
    : isFull
    ? "text-zinc-500"
    : booked === 0
    ? "text-[#00d4ff]"
    : "text-amber-400";

  const handleBook = () => {
    onBook(id);
    toast.success(`Sesión ${startTime} a ${endTime} agendada.`);
  };

  const handleCancel = () => {
    onCancel(id);
    toast("Sesión cancelada.");
  };

  return (
    <div
      className={`
        flex flex-col gap-2 p-4 rounded-xl border transition-all duration-200
        bg-[#0f131a]
        ${userBooked
          ? "border-[#00d4ff]/20 shadow-[0_0_12px_rgba(0,212,255,0.08)]"
          : "border-white/[0.06] hover:border-white/10"
        }
      `}
    >
      {/* Time row */}
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-[#00d4ff] flex-shrink-0" />
        <span className="text-white text-sm font-semibold font-lexend whitespace-nowrap">
          {startTime} a {endTime}
        </span>
      </div>

      {/* Capacity row */}
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs font-inter">Disponibilidad</span>
        <span className={`text-xs font-semibold font-inter ${cuposColor}`}>
          {booked}/{capacity} Cupos
        </span>
      </div>

      {/* Progress bar */}
      <ProgressBar booked={booked} capacity={capacity} />

      {/* Action button */}
      {userBooked && (
        <button
          onClick={handleCancel}
          className="mt-1 w-full py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold font-lexend tracking-wide uppercase hover:bg-red-500/20 transition"
        >
          Cancelar Sesión
        </button>
      )}
      {available && (
        <button
          onClick={handleBook}
          className="mt-1 w-full py-1.5 rounded-lg bg-[#00d4ff] text-[#05050A] text-xs font-bold font-lexend tracking-wide uppercase hover:bg-cyan-300 transition shadow-[0_0_8px_rgba(0,212,255,0.3)]"
        >
          Agendar Sesión
        </button>
      )}
      {isFull && !userBooked && (
        <div className="mt-1 text-center text-xs text-zinc-600 font-inter">
          Sin cupos disponibles
        </div>
      )}
    </div>
  );
}

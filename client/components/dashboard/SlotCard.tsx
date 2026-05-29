import { Clock, AlertCircle, Lock } from "lucide-react";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  userBooked: boolean;
  professionalId?: string; // ID del profesional — necesario para crear el booking
}

interface SlotCardProps {
  slot: TimeSlot;
  onBook: (slotId: string) => void;
  onCancel: (slotId: string) => void;
}

// Helper: Check if cancellation is allowed (12-hour rule)
function canCancelSlot(startTime: string): { allowed: boolean; hoursLeft?: number } {
  const [hours, minutes] = startTime.split(":").map(Number);
  const slotStart = new Date();
  slotStart.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const hoursDiff = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);

  return {
    allowed: hoursDiff >= 12,
    hoursLeft: Math.max(0, Math.ceil(hoursDiff)),
  };
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
  const { allowed: canCancel, hoursLeft } = canCancelSlot(startTime);

  const cuposColor = userBooked
    ? "text-[#00d4ff]"
    : isFull
    ? "text-zinc-500"
    : booked === 0
    ? "text-[#00d4ff]"
    : "text-amber-400";

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

      {/* 12-hour cancellation rule warning */}
      {userBooked && !canCancel && (
        <div className="mt-1 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300 text-[10px] font-inter leading-tight">
            Cancelación no permitida. Menos de 12 horas para la sesión.
          </p>
        </div>
      )}

      {/* Action buttons */}
      {userBooked && canCancel && (
        <button
          onClick={() => onCancel(id)}
          className="mt-1 w-full py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold font-lexend tracking-wide uppercase hover:bg-red-500/20 transition"
        >
          Cancelar Sesión
        </button>
      )}
      {userBooked && !canCancel && (
        <button
          disabled
          className="mt-1 w-full py-1.5 rounded-lg bg-gray-500/10 border border-gray-500/20 text-gray-500 text-xs font-bold font-lexend tracking-wide uppercase opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Lock className="w-3 h-3" />
          No se puede cancelar
        </button>
      )}
      {available && (
        <button
          onClick={() => onBook(id)}
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

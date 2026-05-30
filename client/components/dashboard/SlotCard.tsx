import { Clock, AlertCircle, Lock, History } from "lucide-react";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  userBooked: boolean;
  professionalId?: string; // ID del profesional — necesario para crear el booking
  professionalType?: "kinesiologist" | "nutritionist" | "therapist";
  isPast?: boolean; // si el slot ya pasó (fecha + hora < ahora)
  bookingDate?: Date; // fecha completa del booking (para cálculo de cancelación)
}

interface SlotCardProps {
  slot: TimeSlot;
  onBook: (slotId: string) => void;
  onCancel: (slotId: string) => void;
  minCancelHours?: number; // política de cancelación (default 12h)
}

// Helper: Check if cancellation is allowed using booking's actual date (not "today")
function canCancelSlot(
  startTime: string,
  bookingDate?: Date,
  minHours: number = 12
): { allowed: boolean; hoursLeft: number } {
  const [hours, minutes] = startTime.split(":").map(Number);
  const slotStart = bookingDate ? new Date(bookingDate) : new Date();
  slotStart.setHours(hours, minutes, 0, 0);

  const hoursDiff = (slotStart.getTime() - Date.now()) / (1000 * 60 * 60);

  return {
    allowed: hoursDiff >= minHours,
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

export default function SlotCard({
  slot,
  onBook,
  onCancel,
  minCancelHours = 12,
}: SlotCardProps) {
  const {
    id,
    startTime,
    endTime,
    capacity,
    booked,
    userBooked,
    professionalType,
    isPast,
    bookingDate,
  } = slot;
  const isFull = booked >= capacity;
  const available = !isFull && !userBooked && !isPast;
  const { allowed: canCancel, hoursLeft } = canCancelSlot(
    startTime,
    bookingDate,
    minCancelHours
  );

  const cuposColor = isPast
    ? "text-zinc-600"
    : userBooked
    ? "text-[#00d4ff]"
    : isFull
    ? "text-zinc-500"
    : booked === 0
    ? "text-[#00d4ff]"
    : "text-amber-400";

  const typeBadge =
    professionalType === "nutritionist"
      ? { label: "Nutrición", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" }
      : professionalType === "therapist"
      ? { label: "Terapia", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" }
      : null;

  return (
    <div
      className={`
        flex flex-col gap-2 p-4 rounded-xl border transition-all duration-200
        bg-[#0f131a]
        ${isPast
          ? "border-white/[0.04] opacity-50"
          : userBooked
          ? "border-[#00d4ff]/20 shadow-[0_0_12px_rgba(0,212,255,0.08)]"
          : "border-white/[0.06] hover:border-white/10"
        }
      `}
    >
      {/* Time row */}
      <div className="flex items-center gap-1.5">
        <Clock className={`w-3.5 h-3.5 flex-shrink-0 ${isPast ? "text-zinc-600" : "text-[#00d4ff]"}`} />
        <span className={`text-sm font-semibold font-lexend whitespace-nowrap ${isPast ? "text-zinc-500" : "text-white"}`}>
          {startTime} a {endTime}
        </span>
        {typeBadge && (
          <span className={`ml-auto text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeBadge.className}`}>
            {typeBadge.label}
          </span>
        )}
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

      {/* Past slot indicator */}
      {isPast && (
        <div className="mt-1 flex items-center gap-2 p-2 rounded-lg bg-zinc-500/10 border border-zinc-500/20">
          <History className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
          <p className="text-zinc-400 text-[10px] font-inter leading-tight">
            Este horario ya pasó
          </p>
        </div>
      )}

      {/* Cancellation rule warning (uses real bookingDate) */}
      {userBooked && !isPast && !canCancel && (
        <div className="mt-1 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-amber-300 text-[10px] font-inter leading-tight">
            Cancelación no permitida. Quedan {hoursLeft}h (mín {minCancelHours}h).
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!isPast && userBooked && canCancel && (
        <button
          onClick={() => onCancel(id)}
          className="mt-1 w-full py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold font-lexend tracking-wide uppercase hover:bg-red-500/20 transition"
        >
          Cancelar Sesión
        </button>
      )}
      {!isPast && userBooked && !canCancel && (
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
      {isFull && !userBooked && !isPast && (
        <div className="mt-1 text-center text-xs text-zinc-600 font-inter">
          Sin cupos disponibles
        </div>
      )}
    </div>
  );
}

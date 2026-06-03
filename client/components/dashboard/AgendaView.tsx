import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  Check,
  X,
  CalendarClock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  getProfessionalSchedule,
  confirmBookingAttendance,
  type ScheduleSlot,
} from "@/services/supabase";
import EmptyState from "@/components/dashboard/EmptyState";
import { SkeletonCard } from "@/components/dashboard/Skeleton";

type RangeMode = "day" | "week" | "month";

interface Props {
  professionalId: string;
}

const DAY_NAMES_LONG = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function startOfWeek(d: Date) {
  // Monday as first day (DB convention)
  const c = new Date(d);
  const day = c.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  c.setHours(0, 0, 0, 0);
  return c;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function formatHumanDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const jsDow = d.getDay();
  const dow = jsDow === 0 ? 6 : jsDow - 1;
  return `${DAY_NAMES_LONG[dow]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

function isSameDayISO(iso: string, ref: Date) {
  return iso === toISO(ref);
}

export default function AgendaView({ professionalId }: Props) {
  const [mode, setMode] = useState<RangeMode>("week");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const { fromISO, toISORange, label } = useMemo(() => {
    if (mode === "day") {
      const iso = toISO(cursor);
      return {
        fromISO: iso,
        toISORange: iso,
        label: formatHumanDate(iso),
      };
    }
    if (mode === "week") {
      const start = startOfWeek(cursor);
      const end = addDays(start, 6);
      return {
        fromISO: toISO(start),
        toISORange: toISO(end),
        label: `Semana del ${start.getDate()} ${MONTH_NAMES[start.getMonth()].slice(0, 3)} — ${end.getDate()} ${MONTH_NAMES[end.getMonth()].slice(0, 3)}`,
      };
    }
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return {
      fromISO: toISO(start),
      toISORange: toISO(end),
      label: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`,
    };
  }, [mode, cursor]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getProfessionalSchedule(professionalId, fromISO, toISORange).then((r) => {
      if (!alive) return;
      if (r.success) setSlots(r.data || []);
      else toast.error(`Error cargando agenda: ${r.error}`);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [professionalId, fromISO, toISORange]);

  const slotsByDate = useMemo(() => {
    const m = new Map<string, ScheduleSlot[]>();
    for (const s of slots) {
      const arr = m.get(s.date) || [];
      arr.push(s);
      m.set(s.date, arr);
    }
    return m;
  }, [slots]);

  // Build ordered date list for the range (so empty dates can still render a "no sessions" hint in day-mode)
  const dateList = useMemo(() => {
    const out: string[] = [];
    const start = new Date(fromISO + "T00:00:00");
    const end = new Date(toISORange + "T00:00:00");
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      out.push(toISO(d));
    }
    return out;
  }, [fromISO, toISORange]);

  const handleNav = (dir: -1 | 1) => {
    const c = new Date(cursor);
    if (mode === "day") c.setDate(c.getDate() + dir);
    else if (mode === "week") c.setDate(c.getDate() + dir * 7);
    else c.setMonth(c.getMonth() + dir);
    setCursor(c);
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCursor(d);
  };

  const handleAttendance = async (bookingId: string, attended: boolean) => {
    setUpdating(bookingId);
    const r = await confirmBookingAttendance(bookingId, attended);
    if (r.success) {
      if (attended && r.consumedFromPlan) {
        toast.success("Asistencia confirmada · 1 clase descontada del plan");
      } else if (attended) {
        toast.success("Asistencia confirmada");
      } else {
        toast.success("Marcado como ausente");
      }
      // Optimistic update so the UI doesn't refetch the whole range
      setSlots((cur) =>
        cur.map((s) => ({
          ...s,
          bookings: s.bookings.map((b) =>
            b.id === bookingId ? { ...b, attended } : b,
          ),
          attended_count:
            s.bookings.filter((b) =>
              b.id === bookingId ? attended : b.attended === true,
            ).length,
          pending_attendance:
            s.bookings.filter((b) =>
              b.id === bookingId ? false : b.attended === null,
            ).length,
        })),
      );
    } else {
      toast.error(`Error: ${r.error}`);
    }
    setUpdating(null);
  };

  const totalBookings = slots.reduce((a, s) => a + s.booked, 0);
  const totalPending = slots.reduce((a, s) => a + s.pending_attendance, 0);

  return (
    <div className="space-y-5">
      {/* Range mode tabs + nav */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div role="tablist" aria-label="Rango de vista" className="inline-flex rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
          {(["day", "week", "month"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`
                px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-[0.12em] transition
                ${mode === m ? "bg-cyan-400 text-[#0a0e1a]" : "text-gray-400 hover:text-white"}
              `}
            >
              {m === "day" ? "Día" : m === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleNav(-1)}
            aria-label="Anterior"
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 active:scale-[0.96] transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-200 text-xs font-semibold uppercase tracking-wider"
          >
            Hoy
          </button>
          <button
            onClick={() => handleNav(1)}
            aria-label="Siguiente"
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 active:scale-[0.96] transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header summary */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-400 font-bold">
            {mode === "day" ? "Agenda del día" : mode === "week" ? "Agenda semanal" : "Agenda mensual"}
          </p>
          <h3 className="htk-display text-3xl sm:text-4xl text-white mt-1">{label}</h3>
        </div>
        {!loading && (
          <div className="flex flex-wrap gap-2">
            <span className="htk-chip">
              <Users className="w-3 h-3" />
              {totalBookings} {totalBookings === 1 ? "reserva" : "reservas"}
            </span>
            {totalPending > 0 && (
              <span className="htk-chip htk-chip-accent">
                <AlertCircle className="w-3 h-3" />
                {totalPending} por confirmar
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Content */}
      {!loading && slots.length === 0 && (
        <EmptyState
          icon={CalendarClock}
          title="Sin sesiones en este rango"
          description="No hay reservas confirmadas para los días seleccionados. Cambia el rango o crea disponibilidad."
        />
      )}

      {!loading && slots.length > 0 && (
        <div className="space-y-6">
          {/* In day mode, render only the one date; otherwise iterate the dateList and render dates with slots */}
          {(mode === "day" ? [fromISO] : dateList.filter((d) => slotsByDate.has(d))).map(
            (date) => {
              const dateSlots = slotsByDate.get(date) || [];
              if (mode !== "day" && dateSlots.length === 0) return null;
              const today = isSameDayISO(date, new Date());
              return (
                <section key={date} className="space-y-3">
                  <header className="flex items-center gap-3">
                    <h4 className="text-sm font-bold text-white">
                      {formatHumanDate(date)}
                    </h4>
                    {today && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.14em] font-bold bg-cyan-400/15 text-cyan-300 border border-cyan-400/30">
                        Hoy
                      </span>
                    )}
                    <div className="htk-divider flex-1" />
                    <span className="text-[10px] uppercase tracking-[0.14em] text-gray-500">
                      {dateSlots.length} {dateSlots.length === 1 ? "horario" : "horarios"}
                    </span>
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {dateSlots.length === 0 ? (
                      <p className="text-sm text-gray-500 italic col-span-full">
                        Sin sesiones agendadas para este día.
                      </p>
                    ) : (
                      dateSlots.map((s) => (
                        <SlotBlock
                          key={`${s.date}-${s.start_time}`}
                          slot={s}
                          updating={updating}
                          onAttendance={handleAttendance}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}

function SlotBlock({
  slot,
  updating,
  onAttendance,
}: {
  slot: ScheduleSlot;
  updating: string | null;
  onAttendance: (id: string, attended: boolean) => void;
}) {
  const isFull = slot.capacity > 0 && slot.booked >= slot.capacity;
  const typeBadge =
    slot.professional_type === "nutritionist"
      ? { label: "Nutrición", cls: "bg-purple-500/10 text-purple-300 border-purple-500/25" }
      : slot.professional_type === "therapist"
      ? { label: "Terapia", cls: "bg-amber-500/10 text-amber-300 border-amber-500/25" }
      : { label: "Kinesiología", cls: "bg-cyan-500/10 text-cyan-300 border-cyan-500/25" };

  return (
    <article className="bg-[#0f131a] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Slot header */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="font-bold text-white text-sm whitespace-nowrap">
            {slot.start_time} – {slot.end_time}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold border ${typeBadge.cls}`}>
            {typeBadge.label}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-xs font-mono font-semibold ${
              isFull
                ? "text-zinc-400"
                : slot.booked === 0
                ? "text-gray-500"
                : "text-amber-300"
            }`}
          >
            {slot.booked}{slot.capacity > 0 ? `/${slot.capacity}` : ""}
          </span>
          {slot.pending_attendance > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25">
              {slot.pending_attendance} pend.
            </span>
          )}
        </div>
      </header>

      {/* Bookings list */}
      {slot.bookings.length === 0 ? (
        <div className="px-4 py-5 text-center text-gray-500 text-xs">
          Sin reservas en este horario.
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {slot.bookings.map((b) => {
            const isUpdating = updating === b.id;
            const confirmed = b.attended === true;
            const absent = b.attended === false;
            return (
              <li
                key={b.id}
                className="flex items-center justify-between gap-2 px-4 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-cyan-400/10 border border-cyan-400/25 text-cyan-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                    {(b.student_name || "?")
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-white truncate">
                      {b.student_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {confirmed && (
                        <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-semibold">
                          ✓ Asistió
                        </span>
                      )}
                      {absent && (
                        <span className="text-[9px] uppercase tracking-wider text-red-400 font-semibold">
                          ✗ Ausente
                        </span>
                      )}
                      {b.charged_from_plan && (
                        <span className="text-[9px] uppercase tracking-wider text-cyan-300/80 font-semibold">
                          · Cobrada del plan
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onAttendance(b.id, true)}
                    disabled={isUpdating || confirmed}
                    title="Confirmar asistencia"
                    className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onAttendance(b.id, false)}
                    disabled={isUpdating || absent}
                    title="Marcar ausente"
                    className="p-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 hover:bg-red-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

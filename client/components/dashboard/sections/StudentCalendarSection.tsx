import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getStudentAvailability,
  getStudentBookings,
  createBooking,
  cancelBooking,
  type BookingRecord,
} from "@/services/supabase";
import SlotCard, { type TimeSlot } from "@/components/dashboard/SlotCard";
import ConfirmationModal from "@/components/dashboard/ConfirmationModal";
import {
  getCancellationPolicy,
  type CancellationPolicy,
} from "@/services/contentful";

const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_FULL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const SLOT_TIMES = [
  { start: "07:00", end: "08:30" },
  { start: "08:30", end: "10:00" },
  { start: "10:00", end: "11:30" },
  { start: "11:30", end: "13:00" },
  { start: "15:00", end: "16:30" },
  { start: "16:30", end: "18:00" },
  { start: "18:00", end: "19:30" },
  { start: "19:30", end: "21:00" },
  { start: "21:00", end: "22:30" },
];

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const startDay = weekStart.getDate();
  const endDay = end.getDate();
  const month = MONTH_NAMES[end.getMonth()];
  const year = end.getFullYear();
  return `${startDay} — ${endDay} ${month}, ${year}`;
}

function buildWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function canCancelSlot(startTime: string): {
  allowed: boolean;
  hoursLeft?: number;
} {
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

function getWeekStart(): Date {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day;
  return new Date(today.setDate(diff));
}

export default function StudentCalendarSection({
  studentId,
}: {
  studentId: string;
}) {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"book" | "cancel">("book");
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const { user } = useAuth();
  const weekDays = buildWeekDays(weekStart);

  useEffect(() => {
    getCancellationPolicy().then(setPolicy);
  }, []);

  useEffect(() => {
    if (!studentId) return;
    fetchData();
  }, [studentId, weekStart, selectedDayIdx]);

  const fetchData = async () => {
    if (!studentId) return;
    setIsLoading(true);

    // 1. Traer todos los slots de disponibilidad (recurrentes por día de semana)
    const availResult = await getStudentAvailability(studentId, weekStart);
    if (availResult.success && availResult.data) {
      const selectedDate = weekDays[selectedDayIdx];
      // JS getDay(): 0=Dom,1=Lun...6=Sáb — la DB usa 0=Lun,1=Mar...6=Dom
      // Mapeamos: JS 0 (Dom)→6, JS 1 (Lun)→0, ... JS 6 (Sáb)→5
      const jsDay = selectedDate.getDay();
      const dbDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

      const dayAvailabilities = availResult.data.filter(
        (a) => a.day_of_week === dbDayOfWeek
      );

      // 2. Cada slot = 1 registro de disponibilidad, incluyendo professionalId
      const builtSlots: TimeSlot[] = dayAvailabilities.map((avail) => ({
        id: avail.id,
        startTime: avail.start_time.slice(0, 5),   // "HH:MM"
        endTime: avail.end_time.slice(0, 5),
        capacity: avail.max_capacity,
        booked: 0,
        userBooked: false,
        professionalId: avail.professional_id,      // embebido para el booking
      }));

      // 4. Verificar reservas existentes del alumno para este día
      const bookingResult = await getStudentBookings(studentId, "confirmed");

      if (bookingResult.success && bookingResult.data) {
        setBookings(bookingResult.data);
        const selectedDateStr = selectedDate.toISOString().split("T")[0];

        const builtSlotsWithBookings = builtSlots.map((slot) => {
          const isUserBooked = bookingResult.data!.some(
            (b) =>
              b.booking_date === selectedDateStr &&
              b.start_time.slice(0, 5) === slot.startTime
          );
          return { ...slot, userBooked: isUserBooked };
        });

        setSlots(builtSlotsWithBookings);
      } else {
        setSlots(builtSlots);
      }
    } else {
      setSlots([]);
    }

    setIsLoading(false);
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
    setSelectedDayIdx(0);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
    setSelectedDayIdx(0);
  };

  const handleBookClick = useCallback(
    (slotId: string) => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return;

      if (slot.booked >= slot.capacity) {
        toast.error("No hay cupos disponibles en esta sesión.");
        return;
      }

      setSelectedSlotId(slotId);
      setSelectedSlot(slot);
      setModalAction("book");
      setModalOpen(true);
    },
    [slots]
  );

  const handleCancelClick = useCallback(
    (slotId: string) => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return;

      const { allowed, hoursLeft } = canCancelSlot(slot.startTime);

      if (!allowed) {
        toast.error(
          `No puedes cancelar con menos de 12 horas de anticipación. ` +
            `Quedan ${hoursLeft} horas para la sesión.`
        );
        return;
      }

      setSelectedSlotId(slotId);
      setSelectedSlot(slot);
      setModalAction("cancel");
      setModalOpen(true);
    },
    [slots]
  );

  const handleConfirmBook = async () => {
    if (!selectedSlotId || !user?.id || !selectedSlot) return;

    const professionalId = selectedSlot.professionalId;
    if (!professionalId) {
      toast.error("No se encontró el profesional del horario.");
      return;
    }

    const selectedDate = weekDays[selectedDayIdx];
    const bookingDate = selectedDate.toISOString().split("T")[0]; // YYYY-MM-DD

    setModalLoading(true);
    try {
      const result = await createBooking(
        user.id,
        professionalId,
        bookingDate,
        selectedSlot.startTime,
        selectedSlot.endTime
      );

      if (result.success) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === selectedSlotId
              ? { ...s, userBooked: true, booked: s.booked + 1 }
              : s
          )
        );
        toast.success(
          `Sesión ${selectedSlot?.startTime} a ${selectedSlot?.endTime} agendada correctamente.`
        );
        setModalOpen(false);
      } else {
        toast.error(`Error al agendar: ${result.error}`);
      }
    } catch {
      toast.error("Error inesperado al agendar sesión.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!selectedSlotId || !user?.id || !selectedSlot) return;

    const selectedDate = weekDays[selectedDayIdx];
    const bookingDate = selectedDate.toISOString().split("T")[0];

    setModalLoading(true);
    try {
      const result = await cancelBooking(
        user.id,
        bookingDate,
        selectedSlot.startTime
      );

      if (result.success) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === selectedSlotId
              ? { ...s, userBooked: false, booked: Math.max(0, s.booked - 1) }
              : s
          )
        );
        toast.success(
          `Sesión ${selectedSlot?.startTime} a ${selectedSlot?.endTime} cancelada.`
        );
        setModalOpen(false);
      } else {
        toast.error(`Error al cancelar: ${result.error}`);
      }
    } catch {
      toast.error("Error inesperado al cancelar sesión.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalClose = () => {
    if (!modalLoading) {
      setModalOpen(false);
      setSelectedSlotId(null);
      setSelectedSlot(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Agenda de Sesiones
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Gestiona tus horarios y disponibilidad para la semana actual.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#0f131a] border border-white/[0.08] rounded-xl px-4 py-2.5 self-start">
          <button
            onClick={prevWeek}
            className="text-gray-400 hover:text-white transition"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white text-sm font-semibold font-lexend px-2 whitespace-nowrap">
            {formatWeekRange(weekStart)}
          </span>
          <button
            onClick={nextWeek}
            className="text-gray-400 hover:text-white transition"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Day selector */}
        <div className="lg:block overflow-x-auto">
          <div className="flex lg:flex-col gap-2 min-w-max lg:min-w-0">
            <p className="hidden lg:block text-gray-600 text-[10px] font-semibold tracking-widest uppercase font-lexend px-1 mb-1">
              Días de la Semana
            </p>
            {weekDays.map((d, i) => {
              const active = i === selectedDayIdx;
              const dayNameFull = DAY_NAMES_FULL[d.getDay()];
              const dayNameShort = DAY_NAMES_SHORT[d.getDay()];
              const dayDate = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDayIdx(i)}
                  className={`text-left px-4 py-3 rounded-xl border transition-all duration-150 font-lexend flex-shrink-0 lg:w-36 ${
                    active
                      ? "bg-[#00d4ff]/[0.08] border-[#00d4ff]/30 border-l-2 border-l-[#00d4ff]"
                      : "bg-[#0f131a] border-white/[0.05] hover:border-white/10 hover:bg-white/[0.02]"
                  }`}
                >
                  <p
                    className={`text-[10px] font-medium tracking-wider uppercase ${
                      active ? "text-[#00d4ff]" : "text-gray-600"
                    }`}
                  >
                    <span className="hidden lg:inline">
                      {dayNameFull.toUpperCase()}
                    </span>
                    <span className="lg:hidden">{dayNameShort.toUpperCase()}</span>
                  </p>
                  <p
                    className={`text-sm font-bold mt-0.5 ${
                      active ? "text-[#00d4ff]" : "text-white"
                    }`}
                  >
                    {dayDate}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right content: slots grid */}
        <div className="flex-1 min-w-0">
          <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[#00d4ff]" />
              <h2 className="text-white font-semibold font-lexend text-sm">
                Horarios Disponibles
              </h2>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-gray-500">
                Cargando horarios...
              </div>
            ) : slots.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No hay horarios disponibles para este día
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    onBook={handleBookClick}
                    onCancel={handleCancelClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={modalOpen}
        title={
          modalAction === "book"
            ? "Confirmar Agendamiento"
            : "Confirmar Cancelación"
        }
        message={
          modalAction === "book"
            ? `¿Deseas agendar la sesión de ${selectedSlot?.startTime} a ${selectedSlot?.endTime}?`
            : `¿Estás seguro de que deseas cancelar la sesión de ${selectedSlot?.startTime} a ${selectedSlot?.endTime}? No podrás recuperar el cupo.`
        }
        confirmLabel={
          modalAction === "book" ? "Agendar Sesión" : "Cancelar Sesión"
        }
        cancelLabel="Volver"
        isDangerous={modalAction === "cancel"}
        isLoading={modalLoading}
        icon={modalAction === "book" ? "info" : "warning"}
        onConfirm={
          modalAction === "book" ? handleConfirmBook : handleConfirmCancel
        }
        onCancel={handleModalClose}
      />
    </div>
  );
}

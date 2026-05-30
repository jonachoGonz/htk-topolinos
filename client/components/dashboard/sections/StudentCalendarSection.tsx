import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, User, CreditCard, Apple } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getStudentAvailability,
  getStudentBookings,
  createBooking,
  cancelBooking,
  getAllProfessionals,
  getRemainingPlanClasses,
  isSlotInPast,
  canCancelBooking,
  type BookingRecord,
  type ProfessionalProfile,
  type ProfessionalType,
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
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
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

/**
 * Get the Sunday of the current week — using the user's local timezone.
 * Note: The "week start" is Sunday for display purposes.
 */
function getCurrentWeekStart(): Date {
  const today = new Date();
  const day = today.getDay(); // 0=Sun..6=Sat
  const d = new Date(today);
  d.setDate(today.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface StudentCalendarSectionProps {
  studentId: string;
}

export default function StudentCalendarSection({
  studentId,
}: StudentCalendarSectionProps) {
  // Initialize on TODAY's week, selecting TODAY as the active day
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
  const [selectedDayIdx, setSelectedDayIdx] = useState(() => new Date().getDay());

  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [_bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Plan tracking
  const [planRemaining, setPlanRemaining] = useState<number>(0);
  const [planTotal, setPlanTotal] = useState<number>(4);

  // Professional selector (filter)
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<ProfessionalType | "all">("all");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"book" | "cancel">("book");
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const { user } = useAuth();
  const weekDays = buildWeekDays(weekStart);
  const today = useMemo(() => new Date(), []);

  // Cancellation policy hours (from Contentful or default 12)
  const minCancelHours = policy?.hoursNotice ?? 12;

  useEffect(() => {
    getCancellationPolicy().then(setPolicy).catch(() => setPolicy(null));
  }, []);

  // Load professionals once
  useEffect(() => {
    getAllProfessionals().then((res) => {
      if (res.success) setProfessionals(res.data || []);
    });
  }, []);

  // Refresh plan counts whenever student changes
  useEffect(() => {
    if (!studentId) return;
    getRemainingPlanClasses(studentId).then((res) => {
      if (res.success) {
        setPlanRemaining(res.remaining ?? 0);
        setPlanTotal(res.total ?? 4);
      }
    });
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    fetchData();
  }, [studentId, weekStart, selectedDayIdx, selectedProfessionalId, selectedType]);

  const fetchData = async () => {
    if (!studentId) return;
    setIsLoading(true);

    const availResult = await getStudentAvailability(studentId, weekStart);
    if (availResult.success && availResult.data) {
      const selectedDate = weekDays[selectedDayIdx];
      const jsDay = selectedDate.getDay();
      // DB stores day_of_week: 0=Mon..6=Sun. JS getDay: 0=Sun..6=Sat → map.
      const dbDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

      let dayAvailabilities = availResult.data.filter(
        (a) => a.day_of_week === dbDayOfWeek
      );

      // Filter by selected professional
      if (selectedProfessionalId !== "all") {
        dayAvailabilities = dayAvailabilities.filter(
          (a) => a.professional_id === selectedProfessionalId
        );
      }
      // Filter by professional type
      if (selectedType !== "all") {
        dayAvailabilities = dayAvailabilities.filter(
          (a) => (a.professional_type ?? "kinesiologist") === selectedType
        );
      }

      const builtSlots: TimeSlot[] = dayAvailabilities.map((avail) => ({
        id: avail.id,
        startTime: avail.start_time.slice(0, 5),
        endTime: avail.end_time.slice(0, 5),
        capacity: avail.max_capacity,
        booked: 0,
        userBooked: false,
        professionalId: avail.professional_id,
        professionalType: (avail.professional_type ?? "kinesiologist") as ProfessionalType,
        bookingDate: new Date(selectedDate),
        isPast: isSlotInPast(selectedDate, avail.start_time.slice(0, 5)),
      }));

      // Merge with student's existing bookings
      const bookingResult = await getStudentBookings(studentId, "confirmed");
      if (bookingResult.success && bookingResult.data) {
        setBookings(bookingResult.data);
        const selectedDateStr = selectedDate.toISOString().split("T")[0];

        const builtSlotsWithBookings = builtSlots.map((slot) => {
          const isUserBooked = bookingResult.data!.some(
            (b) =>
              b.booking_date === selectedDateStr &&
              b.start_time.slice(0, 5) === slot.startTime &&
              b.professional_id === slot.professionalId
          );
          return { ...slot, userBooked: isUserBooked };
        });

        // Sort slots by start time
        builtSlotsWithBookings.sort((a, b) => a.startTime.localeCompare(b.startTime));
        setSlots(builtSlotsWithBookings);
      } else {
        builtSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
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

  const goToToday = () => {
    setWeekStart(getCurrentWeekStart());
    setSelectedDayIdx(new Date().getDay());
  };

  const handleBookClick = useCallback(
    (slotId: string) => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return;

      if (slot.isPast) {
        toast.error("No puedes agendar un horario que ya pasó.");
        return;
      }
      if (slot.booked >= slot.capacity) {
        toast.error("No hay cupos disponibles en esta sesión.");
        return;
      }

      // For kinesiologist/therapist: check plan
      const consumesPlan =
        slot.professionalType !== "nutritionist";

      if (consumesPlan && planRemaining <= 0) {
        toast.error(
          "No tienes clases disponibles en tu plan. Renueva o adquiere un nuevo plan."
        );
        return;
      }

      setSelectedSlotId(slotId);
      setSelectedSlot(slot);
      setModalAction("book");
      setModalOpen(true);
    },
    [slots, planRemaining]
  );

  const handleCancelClick = useCallback(
    (slotId: string) => {
      const slot = slots.find((s) => s.id === slotId);
      if (!slot) return;

      const { allowed, hoursLeft } = canCancelBooking(
        slot.bookingDate ?? new Date(),
        slot.startTime,
        minCancelHours
      );

      if (!allowed) {
        toast.error(
          `No puedes cancelar con menos de ${minCancelHours} horas de anticipación. ` +
            `Quedan ${hoursLeft} horas para la sesión.`
        );
        return;
      }

      setSelectedSlotId(slotId);
      setSelectedSlot(slot);
      setModalAction("cancel");
      setModalOpen(true);
    },
    [slots, minCancelHours]
  );

  const handleConfirmBook = async () => {
    if (!selectedSlotId || !user?.id || !selectedSlot) return;

    const professionalId = selectedSlot.professionalId;
    if (!professionalId) {
      toast.error("No se encontró el profesional del horario.");
      return;
    }

    const selectedDate = weekDays[selectedDayIdx];
    const bookingDate = selectedDate.toISOString().split("T")[0];

    setModalLoading(true);
    try {
      const result = await createBooking(
        user.id,
        professionalId,
        bookingDate,
        selectedSlot.startTime,
        selectedSlot.endTime,
        selectedSlot.professionalType ?? "kinesiologist"
      );

      if (result.success) {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === selectedSlotId
              ? { ...s, userBooked: true, booked: s.booked + 1 }
              : s
          )
        );
        // Don't decrement plan on booking — only on attendance confirmation.
        // But show informative toast.
        if (selectedSlot.professionalType === "nutritionist") {
          toast.success(
            `Sesión de nutrición agendada (${selectedSlot.startTime}–${selectedSlot.endTime}). No consume del plan.`
          );
        } else {
          toast.success(
            `Sesión agendada (${selectedSlot.startTime}–${selectedSlot.endTime}). Se descontará del plan al confirmar tu asistencia.`
          );
        }
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
          `Sesión ${selectedSlot.startTime} a ${selectedSlot.endTime} cancelada.`
        );
        // Refresh plan in case it was already charged
        if (studentId) {
          const res = await getRemainingPlanClasses(studentId);
          if (res.success) setPlanRemaining(res.remaining ?? 0);
        }
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

  const filteredProfessionals = useMemo(() => {
    if (selectedType === "all") return professionals;
    return professionals.filter(
      (p) => (p.professional_type ?? "kinesiologist") === selectedType
    );
  }, [professionals, selectedType]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Agenda de Sesiones
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Selecciona profesional, día y horario para tu próxima sesión.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={goToToday}
            className="px-3 py-2 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] text-xs font-semibold font-lexend hover:bg-[#00d4ff]/20 transition"
          >
            Hoy
          </button>
          <div className="flex items-center gap-2 bg-[#0f131a] border border-white/[0.08] rounded-xl px-4 py-2.5">
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
      </div>

      {/* Plan status + filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        {/* Plan classes remaining */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0f131a] border border-white/[0.06]">
          <div className="w-10 h-10 rounded-lg bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-lexend font-semibold">
              Clases disponibles en tu plan
            </p>
            <p className="text-white text-lg font-bold font-montserrat">
              {planRemaining}{" "}
              <span className="text-gray-500 text-sm font-normal">
                / {planTotal}
              </span>
            </p>
          </div>
        </div>

        {/* Professional type filter */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0f131a] border border-white/[0.06]">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold font-lexend px-1">
            Tipo de sesión
          </label>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as any);
              setSelectedProfessionalId("all");
            }}
            className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
          >
            <option value="all">Todos los tipos</option>
            <option value="kinesiologist">Kinesiología (consume plan)</option>
            <option value="nutritionist">Nutrición (no consume plan)</option>
            <option value="therapist">Terapia (consume plan)</option>
          </select>
        </div>

        {/* Professional selector */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0f131a] border border-white/[0.06]">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold font-lexend px-1">
            Profesional
          </label>
          <select
            value={selectedProfessionalId}
            onChange={(e) => setSelectedProfessionalId(e.target.value)}
            className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
          >
            <option value="all">Todos los profesionales</option>
            {filteredProfessionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
                {p.professional_type ? ` — ${p.professional_type}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Nutritionist info banner */}
      {selectedType === "nutritionist" && (
        <div className="mb-5 flex items-start gap-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <Apple className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-purple-300 text-xs font-inter">
            Las sesiones con nutricionista no se descuentan de tu plan de
            entrenamiento. Se cobran por separado.
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Day selector */}
        <div className="lg:block overflow-x-auto">
          <div className="flex lg:flex-col gap-2 min-w-max lg:min-w-0">
            <p className="hidden lg:block text-gray-600 text-[10px] font-semibold tracking-widest uppercase font-lexend px-1 mb-1">
              Días de la Semana
            </p>
            {weekDays.map((d, i) => {
              const active = i === selectedDayIdx;
              const isTodayDay = isSameDay(d, today);
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
                      : isTodayDay
                      ? "bg-[#00d4ff]/[0.03] border-[#00d4ff]/15"
                      : "bg-[#0f131a] border-white/[0.05] hover:border-white/10 hover:bg-white/[0.02]"
                  }`}
                >
                  <p
                    className={`text-[10px] font-medium tracking-wider uppercase flex items-center gap-1 ${
                      active ? "text-[#00d4ff]" : isTodayDay ? "text-[#00d4ff]/70" : "text-gray-600"
                    }`}
                  >
                    <span className="hidden lg:inline">
                      {dayNameFull.toUpperCase()}
                    </span>
                    <span className="lg:hidden">{dayNameShort.toUpperCase()}</span>
                    {isTodayDay && (
                      <span className="text-[8px] bg-[#00d4ff]/20 text-[#00d4ff] px-1 rounded">
                        HOY
                      </span>
                    )}
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
                Horarios{" "}
                {selectedProfessionalId !== "all" && (
                  <span className="text-gray-500 font-normal">
                    —{" "}
                    {
                      professionals.find((p) => p.id === selectedProfessionalId)
                        ?.full_name
                    }
                  </span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-gray-500">
                Cargando horarios...
              </div>
            ) : slots.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No hay horarios disponibles para este día con los filtros
                seleccionados.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {slots.map((slot) => (
                  <SlotCard
                    key={slot.id}
                    slot={slot}
                    onBook={handleBookClick}
                    onCancel={handleCancelClick}
                    minCancelHours={minCancelHours}
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
            ? selectedSlot?.professionalType === "nutritionist"
              ? `Sesión de Nutrición ${selectedSlot?.startTime} a ${selectedSlot?.endTime}. No consume del plan; se cobra por separado.`
              : `¿Deseas agendar la sesión de ${selectedSlot?.startTime} a ${selectedSlot?.endTime}? Se descontará 1 clase de tu plan al confirmar asistencia.`
            : `¿Estás seguro de que deseas cancelar la sesión de ${selectedSlot?.startTime} a ${selectedSlot?.endTime}? Cancelaciones con menos de ${minCancelHours}h no son reembolsables.`
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

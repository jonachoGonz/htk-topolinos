import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  BadgeCheck,
  Clock,
  Bell,
  UserCircle,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { createBooking, cancelBooking } from "@/services/supabase";
import Sidebar from "@/components/dashboard/Sidebar";
import SlotCard, { type TimeSlot } from "@/components/dashboard/SlotCard";
import ConfirmationModal from "@/components/dashboard/ConfirmationModal";
import {
  getCancellationPolicy,
  getActivePlan,
  type CancellationPolicy,
  type ActivePlan,
} from "@/services/contentful";
import { getCurrentWeekStart } from "@/services/cronofy";

// ─── Constants ───────────────────────────────────────────────────────
const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_FULL = [
  "Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado",
];
const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

// Student-facing slot times (90-min blocks with lunch break 13:00-15:00)
const SLOT_TIMES = [
  { start: "07:00", end: "08:30" },
  { start: "08:30", end: "10:00" },
  { start: "10:00", end: "11:30" },
  { start: "11:30", end: "13:00" },
  // 13:00 - 15:00 lunch/closure
  { start: "15:00", end: "16:30" },
  { start: "16:30", end: "18:00" },
  { start: "18:00", end: "19:30" },
  { start: "19:30", end: "21:00" },
  { start: "21:00", end: "22:30" },
];

// Generate realistic mock availability for a given day index
function generateDaySlots(dayOffset: number, selectedDay: number): TimeSlot[] {
  const patterns: Array<{ booked: number; userBooked?: boolean }> = [
    { booked: 0 },
    { booked: 1 },
    { booked: 3 },
    { booked: 6 },
    { booked: 6 },
    { booked: 6 },
    { booked: 1 },
    { booked: 4, userBooked: true },
    { booked: 0 },
  ];

  return SLOT_TIMES.map((slot, i) => ({
    id: `${dayOffset}-${selectedDay}-${slot.start}`,
    startTime: slot.start,
    endTime: slot.end,
    capacity: 6,
    booked: patterns[i]?.booked ?? 0,
    userBooked: patterns[i]?.userBooked ?? false,
  }));
}

// Format week range label e.g. "12 — 18 Mayo, 2024"
function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const startDay = weekStart.getDate();
  const endDay = end.getDate();
  const month = MONTH_NAMES[end.getMonth()];
  const year = end.getFullYear();
  return `${startDay} — ${endDay} ${month}, ${year}`;
}

// Build 6-day student week (Mon–Sat)
function buildWeekDays(weekStart: Date) {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// ─── Top Bar ─────────────────────────────────────────────────────────
function StudentTopBar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const [activeTab, setActiveTab] = useState("Calendario");
  return (
    <header className="sticky top-0 z-10 bg-[#0a0e1a]/90 backdrop-blur-md border-b border-white/[0.06] px-5 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <button onClick={onMenuToggle} className="lg:hidden text-gray-400 hover:text-white transition flex-shrink-0">
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium font-lexend whitespace-nowrap">
          <span className="text-white">HTK Center - </span>
          <span className="text-[#00d4ff]">Plataformar Alumno</span>
        </span>
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {["Dashboard", "Calendario"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm font-medium font-lexend rounded transition-all ${
                activeTab === tab
                  ? "text-[#00d4ff] border-b-2 border-[#00d4ff] rounded-none"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5">
          <Bell className="w-[18px] h-[18px]" />
        </button>
        <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition rounded-lg hover:bg-white/5">
          <UserCircle className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}

// ─── Day Selector ─────────────────────────────────────────────────────
function DaySelector({
  days,
  selectedIndex,
  onSelect,
}: {
  days: Date[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 min-w-[140px]">
      <p className="text-gray-600 text-[10px] font-semibold tracking-widest uppercase font-lexend px-1 mb-1">
        Días de la Semana
      </p>
      {days.map((d, i) => {
        const active = i === selectedIndex;
        const dayName = DAY_NAMES_FULL[d.getDay()].toUpperCase();
        const dayDate = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={`text-left px-4 py-3 rounded-xl border transition-all duration-150 font-lexend ${
              active
                ? "bg-[#00d4ff]/[0.08] border-[#00d4ff]/30 border-l-2 border-l-[#00d4ff]"
                : "bg-[#0f131a] border-white/[0.05] hover:border-white/10 hover:bg-white/[0.02]"
            }`}
          >
            <p className={`text-[10px] font-medium tracking-wider uppercase ${active ? "text-[#00d4ff]" : "text-gray-600"}`}>
              {dayName}
            </p>
            <p className={`text-sm font-bold mt-0.5 ${active ? "text-[#00d4ff]" : "text-white"}`}>
              {dayDate}
            </p>
          </button>
        );
      })}
    </div>
  );
}

// ─── Policy Widget ────────────────────────────────────────────────────
function PolicyWidget({ policy }: { policy: CancellationPolicy | null }) {
  return (
    <div className="flex-1 bg-[#0f131a] border border-amber-500/20 rounded-xl p-4 flex gap-3">
      <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-amber-400 text-xs font-bold tracking-widest uppercase font-lexend mb-2">
          {policy?.title ?? "POLÍTICA DE CANCELACIÓN"}
        </p>
        <p className="text-gray-400 text-xs font-inter leading-relaxed">
          {policy?.description ?? "Las cancelaciones deben realizarse con al menos"}{" "}
          <strong className="text-white font-semibold">
            {policy?.hoursNotice ?? 12} horas de anticipación.
          </strong>
        </p>
      </div>
    </div>
  );
}

// ─── Plan Widget ──────────────────────────────────────────────────────
function PlanWidget({ plan }: { plan: ActivePlan | null }) {
  const used = plan?.sessionsUsed ?? 0;
  const total = plan?.sessionsTotal ?? 8;
  return (
    <div className="w-full sm:w-64 lg:w-72 bg-[#0f131a] border border-white/[0.06] rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[#00d4ff] text-[10px] font-semibold tracking-widest uppercase font-lexend">
          Plan Activo
        </p>
        <BadgeCheck className="w-5 h-5 text-[#00d4ff]" />
      </div>
      <p className="text-white font-bold text-base font-lexend">
        {plan?.name ?? "Plan Anual Pro"}
      </p>
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-xs font-inter">Sesiones disponibles para agendar</p>
        <span className="text-gray-400 text-sm font-bold font-lexend">
          {used}/{total}
        </span>
      </div>
    </div>
  );
}

// ─── Helper: Check if cancellation is allowed (12-hour rule) ──────────
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

// ─── Student Calendar Page ────────────────────────────────────────────
export default function StudentCalendar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [weekStart, setWeekStart] = useState(getCurrentWeekStart());
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null);
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const { user } = useAuth();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"book" | "cancel">("book");
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const weekDays = buildWeekDays(weekStart);

  // Load data on mount
  useEffect(() => {
    getCancellationPolicy().then(setPolicy);
    getActivePlan().then(setPlan);
  }, []);

  // Generate slots whenever day or week changes
  useEffect(() => {
    setSlots(generateDaySlots(weekStart.getTime(), selectedDayIdx));
  }, [weekStart, selectedDayIdx]);

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

  // Handle book action - show confirmation modal
  const handleBookClick = useCallback((slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    // Check capacity
    if (slot.booked >= slot.capacity) {
      toast.error("No hay cupos disponibles en esta sesión.");
      return;
    }

    setSelectedSlotId(slotId);
    setSelectedSlot(slot);
    setModalAction("book");
    setModalOpen(true);
  }, [slots]);

  // Handle cancel action - check 12-hour rule and show confirmation modal
  const handleCancelClick = useCallback((slotId: string) => {
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
  }, [slots]);

  // Confirm booking
  const handleConfirmBook = async () => {
    if (!selectedSlotId || !user) return;

    setModalLoading(true);
    try {
      const result = await createBooking(user.id, selectedSlotId);

      if (result.success) {
        // Update local state
        setSlots((prev) =>
          prev.map((s) =>
            s.id === selectedSlotId
              ? { ...s, userBooked: true, booked: s.booked + 1 }
              : s
          )
        );
        setPlan((p) => (p ? { ...p, sessionsUsed: p.sessionsUsed + 1 } : p));

        toast.success(
          `Sesión ${selectedSlot?.startTime} a ${selectedSlot?.endTime} agendada correctamente.`
        );
        setModalOpen(false);
      } else {
        toast.error(`Error al agendar: ${result.error}`);
      }
    } catch (error) {
      toast.error("Error inesperado al agendar sesión.");
      console.error(error);
    } finally {
      setModalLoading(false);
    }
  };

  // Confirm cancellation
  const handleConfirmCancel = async () => {
    if (!selectedSlotId || !user) return;

    setModalLoading(true);
    try {
      const result = await cancelBooking(user.id, selectedSlotId);

      if (result.success) {
        // Update local state
        setSlots((prev) =>
          prev.map((s) =>
            s.id === selectedSlotId
              ? { ...s, userBooked: false, booked: Math.max(0, s.booked - 1) }
              : s
          )
        );
        setPlan((p) =>
          p ? { ...p, sessionsUsed: Math.max(0, p.sessionsUsed - 1) } : p
        );

        toast.success(
          `Sesión ${selectedSlot?.startTime} a ${selectedSlot?.endTime} cancelada.`
        );
        setModalOpen(false);
      } else {
        toast.error(`Error al cancelar: ${result.error}`);
      }
    } catch (error) {
      toast.error("Error inesperado al cancelar sesión.");
      console.error(error);
    } finally {
      setModalLoading(false);
    }
  };

  // Close modal
  const handleModalClose = () => {
    if (!modalLoading) {
      setModalOpen(false);
      setSelectedSlotId(null);
      setSelectedSlot(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#05050A] text-white overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="student"
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StudentTopBar onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-[#0a0e1a] p-5 lg:p-6">
          {/* ── Section header ─────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white font-montserrat">
                Agenda de Sesiones
              </h1>
              <p className="text-gray-400 text-sm font-inter mt-1">
                Gestiona tus horarios y disponibilidad para la semana actual.
              </p>
            </div>

            {/* Week picker */}
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

          {/* ── Main grid: day selector + content ──────────────── */}
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Day selector — vertical on desktop, horizontal scroll on mobile */}
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
                      <p className={`text-[10px] font-medium tracking-wider uppercase ${active ? "text-[#00d4ff]" : "text-gray-600"}`}>
                        <span className="hidden lg:inline">{dayNameFull.toUpperCase()}</span>
                        <span className="lg:hidden">{dayNameShort.toUpperCase()}</span>
                      </p>
                      <p className={`text-sm font-bold mt-0.5 ${active ? "text-[#00d4ff]" : "text-white"}`}>
                        {dayDate}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right content: widgets + slot grid */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Widgets row */}
              <div className="flex flex-col sm:flex-row gap-4">
                <PolicyWidget policy={policy} />
                <PlanWidget plan={plan} />
              </div>

              {/* Slots grid */}
              <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-[#00d4ff]" />
                  <h2 className="text-white font-semibold font-lexend text-sm">
                    Horarios Disponibles
                  </h2>
                </div>

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
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
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
        confirmLabel={modalAction === "book" ? "Agendar Sesión" : "Cancelar Sesión"}
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

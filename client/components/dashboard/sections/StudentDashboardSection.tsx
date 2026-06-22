import { useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Apple,
  Activity,
  Dumbbell,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  getStudentPlan,
  getStudentBookings,
  getPatientAttendance,
  listBodyEvaluations,
  listStrengthEvaluations,
  STRENGTH_EXERCISES,
  type Plan,
  type BookingRecord,
  type PatientAttendance,
  type BodyEvaluation,
  type StrengthEvaluation,
} from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonStat } from "@/components/dashboard/Skeleton";

interface Props {
  onNavigate?: (tab: string) => void;
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const WEEKDAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function formatLongDate(d: Date) {
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}

function formatShortDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getDate()} ${MONTHS_ES[d.getMonth()].slice(0, 3)}`;
}

function todayHeading() {
  const t = new Date();
  return `${t.getDate()} de ${MONTHS_ES[t.getMonth()][0].toUpperCase() + MONTHS_ES[t.getMonth()].slice(1)}, ${t.getFullYear()}`;
}

type PlanStatus = "active" | "expiring" | "expired";

function getPlanStatus(plan: Plan): { status: PlanStatus; days: number } {
  const days = Math.ceil(
    (new Date(plan.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days < 0) return { status: "expired", days };
  if (days <= 7) return { status: "expiring", days };
  return { status: "active", days };
}

const STATUS_META: Record<
  PlanStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  active:   { label: "Activo",       dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/20" },
  expiring: { label: "Por vencer",   dot: "bg-amber-400",   text: "text-amber-300",   bg: "bg-amber-500/10 border-amber-500/20" },
  expired:  { label: "Vencido",      dot: "bg-red-400",     text: "text-red-300",     bg: "bg-red-500/10 border-red-500/20" },
};

export default function StudentDashboardSection({ onNavigate }: Props = {}) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [attendance, setAttendance] = useState<PatientAttendance | null>(null);
  const [bodyEvals, setBodyEvals] = useState<BodyEvaluation[]>([]);
  const [strengthEvals, setStrengthEvals] = useState<StrengthEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [pRes, bRes, aRes, beRes, seRes] = await Promise.all([
        getStudentPlan(user.id),
        getStudentBookings(user.id),
        getPatientAttendance(user.id),
        listBodyEvaluations(user.id),
        listStrengthEvaluations(user.id),
      ]);
      if (cancelled) return;
      setPlan(pRes.success ? pRes.data ?? null : null);
      setBookings(bRes.success ? bRes.data ?? [] : []);
      setAttendance(aRes.success ? aRes.data ?? null : null);
      setBodyEvals(beRes.success ? beRes.data ?? [] : []);
      setStrengthEvals(seRes.success ? seRes.data ?? [] : []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const now = useMemo(() => new Date(), []);
  const todayIso = now.toISOString().slice(0, 10);

  const upcomingConfirmed = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "confirmed" && b.booking_date >= todayIso)
        .sort((a, b) =>
          a.booking_date === b.booking_date
            ? a.start_time.localeCompare(b.start_time)
            : a.booking_date.localeCompare(b.booking_date),
        ),
    [bookings, todayIso],
  );

  const nextClass = upcomingConfirmed[0];

  // Clases agendadas en el mes calendario actual.
  // Excluimos nutricionista: el cupo monthly_class_count corresponde a
  // sesiones de entrenamiento (kinesi/terapia), no controles nutri.
  const monthPrefix = todayIso.slice(0, 7);
  const bookedThisMonth = useMemo(
    () =>
      bookings.filter(
        (b) =>
          (b.status === "confirmed" || b.status === "completed") &&
          b.booking_date.startsWith(monthPrefix) &&
          b.professional_type !== "nutritionist",
      ).length,
    [bookings, monthPrefix],
  );

  const monthlyTarget = plan?.monthly_class_count ?? 0;
  const unscheduledThisMonth = Math.max(0, monthlyTarget - bookedThisMonth);

  const needsNutriBooking =
    !!plan?.has_nutrition_tracking &&
    !bookings.some(
      (b) =>
        b.professional_type === "nutritionist" &&
        (b.status === "confirmed" || b.status === "completed") &&
        b.booking_date.startsWith(monthPrefix),
    );

  const planStatus = plan ? getPlanStatus(plan) : null;
  const planContractedAt = plan ? new Date(plan.created_at) : null;
  const planExpiresAt = plan ? new Date(plan.expiry_date) : null;
  const sessionsUsed = plan ? plan.total_sessions - plan.remaining_sessions : 0;
  const progressPct = plan && plan.total_sessions > 0
    ? Math.min(100, Math.round((sessionsUsed / plan.total_sessions) * 100))
    : 0;

  const goToCalendar = () => onNavigate?.("calendario");
  const goToPayments = () => onNavigate?.("pagos");

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat leading-tight">
            Mi Panel
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Tu plan, tus clases y lo que viene.
          </p>
        </div>
        <p className="text-[#0ea5e9] text-sm font-semibold font-lexend">
          {todayHeading()}
        </p>
      </header>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
        </div>
      ) : (
        <>
          {/* === MI PLAN === */}
          <section
            aria-labelledby="plan-heading"
            className="bg-[#0f131a] border border-white/[0.06] rounded-2xl overflow-hidden"
          >
            {plan && planStatus && planContractedAt && planExpiresAt ? (
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-inter">
                      Mi plan
                    </p>
                    <h2
                      id="plan-heading"
                      className="text-xl sm:text-2xl font-bold text-white font-lexend mt-1 truncate"
                    >
                      {plan.name}
                    </h2>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-semibold ${STATUS_META[planStatus.status].bg} ${STATUS_META[planStatus.status].text}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[planStatus.status].dot}`} />
                    {STATUS_META[planStatus.status].label}
                  </span>
                </div>

                {/* Progress */}
                <div className="mt-6">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Usadas</p>
                      <p className="text-2xl font-bold text-white font-lexend mt-0.5 tabular-nums">
                        {sessionsUsed}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Pendientes</p>
                      <p className="text-2xl font-bold text-[#00d4ff] font-lexend mt-0.5 tabular-nums">
                        {plan.remaining_sessions}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Totales</p>
                      <p className="text-2xl font-bold text-white/80 font-lexend mt-0.5 tabular-nums">
                        {plan.total_sessions}
                      </p>
                    </div>
                  </div>
                  <div
                    className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPct}
                    aria-label={`Progreso del plan: ${sessionsUsed} de ${plan.total_sessions} clases`}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-[#00d4ff] to-emerald-400 transition-[width] duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 font-inter">
                    {progressPct}% del plan utilizado
                  </p>
                </div>

                {/* Meta + CTA */}
                <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm font-inter">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-gray-500">Contratado</dt>
                      <dd className="text-white/90 mt-0.5">{formatLongDate(planContractedAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-gray-500">Vence</dt>
                      <dd className={`mt-0.5 ${planStatus.status === "expiring" ? "text-amber-300" : planStatus.status === "expired" ? "text-red-300" : "text-white/90"}`}>
                        {formatLongDate(planExpiresAt)}
                        <span className="text-gray-500"> · </span>
                        <span className="tabular-nums">
                          {planStatus.days < 0
                            ? `hace ${Math.abs(planStatus.days)} días`
                            : `en ${planStatus.days} días`}
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    onClick={goToPayments}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#00d4ff] text-[#05050A] font-semibold text-sm hover:bg-[#00d4ff]/90 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d4ff]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f131a] min-h-[44px]"
                  >
                    <Sparkles className="w-4 h-4" />
                    {planStatus.status === "expired" ? "Renovar ahora" : "Renovar plan"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-white font-lexend font-semibold">No tienes un plan activo</p>
                <p className="text-gray-400 text-sm font-inter mt-1 mb-4">
                  Contrata un plan para comenzar a agendar tus clases.
                </p>
                <button
                  type="button"
                  onClick={goToPayments}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#00d4ff] text-[#05050A] font-semibold text-sm hover:bg-[#00d4ff]/90 transition min-h-[44px]"
                >
                  Ver planes disponibles
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>

          {/* === MIS CLASES === */}
          <section aria-labelledby="clases-heading" className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 id="clases-heading" className="text-lg font-semibold text-white font-lexend">
                Mis clases
              </h2>
              <button
                type="button"
                onClick={goToCalendar}
                className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-[#00d4ff] font-bold hover:gap-1.5 transition-all"
              >
                Ver agenda <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-3 gap-3">
              <MiniStat
                label="Agendadas"
                value={upcomingConfirmed.length}
                tone="cyan"
                icon={<CalendarPlus className="w-4 h-4" />}
              />
              <MiniStat
                label="Asistencias"
                value={attendance?.attended_count ?? 0}
                tone="emerald"
                icon={<CheckCircle2 className="w-4 h-4" />}
              />
              <MiniStat
                label="Inasistencias"
                value={attendance?.absent_count ?? 0}
                tone="red"
                icon={<XCircle className="w-4 h-4" />}
              />
            </div>

            {/* Alerta seguimiento nutri */}
            {needsNutriBooking && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-green-500/25 bg-green-500/[0.06]">
                <div className="w-9 h-9 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <Apple className="w-5 h-5 text-green-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-green-100 font-semibold text-sm font-lexend">
                    Te falta tu control mensual con nutricionista
                  </p>
                  <p className="text-green-200/70 text-xs font-inter mt-1">
                    Tu plan incluye seguimiento nutricional. Aún no tienes cita agendada este mes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={goToCalendar}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-400 text-green-950 font-semibold text-xs hover:bg-green-300 transition self-center flex-shrink-0 min-h-[40px]"
                >
                  Agendar
                </button>
              </div>
            )}

            {/* Alerta clases sin agendar */}
            {plan && unscheduledThisMonth > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06]">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-amber-100 font-semibold text-sm font-lexend">
                    Te {unscheduledThisMonth === 1 ? "queda 1 clase" : `quedan ${unscheduledThisMonth} clases`} por agendar este mes
                  </p>
                  <p className="text-amber-200/70 text-xs font-inter mt-1">
                    Tu plan incluye {monthlyTarget} clases mensuales. Ya tienes {bookedThisMonth} agendadas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={goToCalendar}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 text-amber-950 font-semibold text-xs hover:bg-amber-300 transition self-center flex-shrink-0 min-h-[40px]"
                >
                  Agendar
                </button>
              </div>
            )}

            {/* Próxima clase + lista */}
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              {/* Próxima clase */}
              <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#00d4ff] to-emerald-400 opacity-0" aria-hidden />
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-inter">
                  Tu próxima clase
                </p>
                {nextClass ? (
                  <>
                    <p className="text-2xl font-bold text-white font-lexend mt-2 capitalize">
                      {(() => {
                        const d = new Date(nextClass.booking_date + "T00:00:00");
                        const isToday = nextClass.booking_date === todayIso;
                        const tomorrowIso = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
                        const isTomorrow = nextClass.booking_date === tomorrowIso;
                        if (isToday) return "Hoy";
                        if (isTomorrow) return "Mañana";
                        return WEEKDAYS_ES[d.getDay()];
                      })()}
                    </p>
                    <p className="text-gray-400 text-sm font-inter mt-0.5">
                      {formatShortDate(nextClass.booking_date)} ·{" "}
                      <span className="text-white/80 tabular-nums">
                        {nextClass.start_time.slice(0, 5)}–{nextClass.end_time.slice(0, 5)}
                      </span>
                    </p>
                    {nextClass.booking_date === todayIso && (
                      <span className="inline-block mt-3 text-[10px] uppercase tracking-wider bg-[#00d4ff]/15 text-[#00d4ff] px-2 py-0.5 rounded font-bold">
                        Hoy
                      </span>
                    )}
                  </>
                ) : (
                  <div className="mt-3">
                    <p className="text-white/80 text-sm">No tienes clases agendadas.</p>
                    <button
                      type="button"
                      onClick={goToCalendar}
                      className="inline-flex items-center gap-1 mt-3 text-[#00d4ff] text-sm font-semibold hover:gap-1.5 transition-all"
                    >
                      Agendar tu primera clase <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Lista próximas */}
              <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06]">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-inter">
                    Próximas sesiones
                  </p>
                </div>
                {upcomingConfirmed.length === 0 ? (
                  <p className="px-5 py-6 text-center text-gray-500 text-sm">
                    Nada agendado por ahora.
                  </p>
                ) : (
                  <ul className="divide-y divide-white/[0.04]">
                    {upcomingConfirmed.slice(0, 5).map((b) => {
                      const d = new Date(b.booking_date + "T00:00:00");
                      const isToday = b.booking_date === todayIso;
                      return (
                        <li key={b.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="text-center w-10 flex-shrink-0">
                            <p className="text-[10px] uppercase text-gray-500">
                              {d.toLocaleDateString("es", { weekday: "short" })}
                            </p>
                            <p className={`text-base font-bold tabular-nums ${isToday ? "text-[#00d4ff]" : "text-white"}`}>
                              {d.getDate()}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium tabular-nums">
                              {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                            </p>
                            {isToday && (
                              <span className="text-[10px] uppercase tracking-wider text-[#00d4ff] font-bold">
                                Hoy
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* === EVALUACIÓN CORPORAL === */}
          <BodyEvaluationSection items={bodyEvals} />

          {/* === FUERZA === */}
          <StrengthSection items={strengthEvals} />
        </>
      )}
    </div>
  );
}

function BodyEvaluationSection({ items }: { items: BodyEvaluation[] }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.measured_at.localeCompare(b.measured_at)),
    [items],
  );
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  const chartData = sorted
    .filter((e) => e.weight_kg != null)
    .map((e) => ({
      date: e.measured_at.slice(5),
      kg: Number(e.weight_kg),
    }));

  const deltaWeight = latest?.weight_kg != null && previous?.weight_kg != null
    ? Number(latest.weight_kg) - Number(previous.weight_kg)
    : null;

  // Detectar zona de mayor crecimiento muscular (perimetros)
  const growthHotspot = useMemo(() => {
    if (!latest || !previous) return null;
    const keys: Array<{ k: keyof BodyEvaluation; label: string }> = [
      { k: "chest_cm", label: "Pecho" },
      { k: "arm_cm",   label: "Brazo" },
      { k: "thigh_cm", label: "Muslo" },
      { k: "calf_cm",  label: "Pantorrilla" },
    ];
    let best: { label: string; delta: number } | null = null;
    for (const { k, label } of keys) {
      const a = latest[k] as number | null | undefined;
      const b = previous[k] as number | null | undefined;
      if (a != null && b != null) {
        const d = Number(a) - Number(b);
        if (!best || d > best.delta) best = { label, delta: d };
      }
    }
    return best && best.delta > 0 ? best : null;
  }, [latest, previous]);

  return (
    <section
      aria-labelledby="body-eval-heading"
      className="bg-[#0f131a] border border-white/[0.06] rounded-2xl overflow-hidden"
    >
      <header className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00d4ff]" />
          <h2 id="body-eval-heading" className="text-white font-semibold font-lexend text-sm">
            Evaluación corporal
          </h2>
        </div>
        {latest && (
          <span className="text-[10px] uppercase tracking-wider text-gray-500 tabular-nums">
            Última: {latest.measured_at}
          </span>
        )}
      </header>

      {!latest ? (
        <p className="p-8 text-center text-gray-500 text-sm">
          Tu profesional aún no ha registrado mediciones. Aparecerán aquí cuando lo haga.
        </p>
      ) : (
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricTile label="Peso" value={latest.weight_kg} unit="kg" delta={deltaWeight} />
            <MetricTile label="% Grasa" value={latest.body_fat_pct} unit="%" />
            <MetricTile label="% Músculo" value={latest.muscle_mass_pct} unit="%" />
            <MetricTile label="Cintura" value={latest.waist_cm} unit="cm" />
          </div>

          {chartData.length >= 2 && (
            <div className="h-44 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#6b7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                    width={30}
                  />
                  <Tooltip
                    contentStyle={{ background: "#05050A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9ca3af" }}
                    formatter={(v: any) => [`${v} kg`, "Peso"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="kg"
                    stroke="#00d4ff"
                    strokeWidth={2}
                    dot={{ fill: "#00d4ff", r: 3 }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {growthHotspot && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 text-xs">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
              <span className="text-emerald-100">
                Mayor crecimiento muscular en{" "}
                <span className="font-semibold">{growthHotspot.label.toLowerCase()}</span>:
                {" "}
                <span className="tabular-nums">+{growthHotspot.delta.toFixed(1)} cm</span> vs. medición previa
              </span>
            </div>
          )}

          {latest.objectives && (latest.objectives.general || latest.objectives.specific_1) && (
            <div className="px-3 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
                Objetivos vigentes (desde {latest.measured_at})
              </p>
              <ul className="space-y-1 text-xs text-white/90 list-disc pl-4">
                {[latest.objectives.specific_1, latest.objectives.specific_2, latest.objectives.specific_3]
                  .filter(Boolean)
                  .map((o, i) => <li key={i}>{o}</li>)}
              </ul>
              {latest.objectives.general && (
                <p className="text-xs text-gray-400 mt-2">
                  <span className="text-gray-500">General:</span> {latest.objectives.general}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function MetricTile({
  label, value, unit, delta,
}: { label: string; value?: number | null; unit: string; delta?: number | null }) {
  return (
    <div className="bg-[#05050A] border border-white/[0.06] rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="text-xl font-bold text-white font-lexend tabular-nums mt-1">
        {value != null ? Number(value) : "—"}
        {value != null && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
      </p>
      {delta != null && delta !== 0 && (
        <p className={`text-[10px] mt-1 inline-flex items-center gap-0.5 tabular-nums ${delta > 0 ? "text-amber-300" : "text-emerald-300"}`}>
          {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {delta > 0 ? "+" : ""}{delta.toFixed(1)} {unit}
        </p>
      )}
    </div>
  );
}

function StrengthSection({ items }: { items: StrengthEvaluation[] }) {
  // Para cada ejercicio: peso actual (más reciente) y máximo histórico
  const summary = useMemo(() => {
    const byEx = new Map<string, { latest?: StrengthEvaluation; max: number }>();
    for (const r of items) {
      const cur = byEx.get(r.exercise) || { max: 0 };
      if (!cur.latest || r.measured_at > cur.latest.measured_at) cur.latest = r;
      if (Number(r.weight_kg) > cur.max) cur.max = Number(r.weight_kg);
      byEx.set(r.exercise, cur);
    }
    return STRENGTH_EXERCISES
      .map((e) => ({ key: e.key, label: e.label, ...byEx.get(e.key) }))
      .filter((row) => row.latest);
  }, [items]);

  return (
    <section
      aria-labelledby="strength-heading"
      className="bg-[#0f131a] border border-white/[0.06] rounded-2xl overflow-hidden"
    >
      <header className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
        <Dumbbell className="w-4 h-4 text-emerald-300" />
        <h2 id="strength-heading" className="text-white font-semibold font-lexend text-sm">
          Evaluación de fuerza
        </h2>
      </header>

      {summary.length === 0 ? (
        <p className="p-8 text-center text-gray-500 text-sm">
          Aún no hay registros de fuerza. Tu profesional los irá sumando.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead className="text-[10px] uppercase tracking-wider text-gray-500">
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-3 px-5">Ejercicio</th>
                <th className="text-right px-3">Actual</th>
                <th className="text-right px-3">Máximo</th>
                <th className="text-right px-5">Fecha</th>
              </tr>
            </thead>
            <tbody className="font-inter text-white/90">
              {summary.map((row) => {
                const cur = Number(row.latest!.weight_kg);
                const isMax = cur === row.max;
                return (
                  <tr key={row.key} className="border-b border-white/[0.04]">
                    <td className="py-2.5 px-5 font-medium">{row.label}</td>
                    <td className={`text-right px-3 tabular-nums ${isMax ? "text-emerald-300 font-semibold" : ""}`}>
                      {cur} kg
                    </td>
                    <td className="text-right px-3 tabular-nums text-white">{row.max} kg</td>
                    <td className="text-right px-5 tabular-nums text-gray-500 text-xs">
                      {row.latest!.measured_at}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "cyan" | "emerald" | "red";
  icon: React.ReactNode;
}) {
  const toneCls = {
    cyan: "text-[#00d4ff] bg-[#00d4ff]/10",
    emerald: "text-emerald-300 bg-emerald-500/10",
    red: "text-red-300 bg-red-500/10",
  }[tone];
  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-inter">{label}</p>
        <span className={`w-7 h-7 rounded-md flex items-center justify-center ${toneCls}`}>{icon}</span>
      </div>
      <p className="text-2xl font-bold text-white font-lexend tabular-nums leading-none">{value}</p>
    </div>
  );
}

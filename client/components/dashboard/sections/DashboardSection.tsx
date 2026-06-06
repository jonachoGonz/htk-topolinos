import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock, Users, AlertTriangle, Clock,
  CheckCircle2, Loader2, ArrowRight, Check, X,
  PhoneCall, CalendarX, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { SkeletonStat } from "@/components/dashboard/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTodayOverview, supabase, confirmBookingAttendance,
  findStudentsMissingMonthlyEval,
  findStudentsMissingNutritionBooking,
  type TodayOverview,
} from "@/services/supabase";
import { ClipboardCheck, Apple } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface NextClass {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  student_id: string;
  student_name?: string;
  attended?: boolean | null;
}

interface CancelledClass {
  id: string;
  booking_date: string;
  start_time: string;
  cancelled_at: string;
  notes?: string | null;
  student_id: string;
  student_name?: string;
  student_phone?: string | null;
}

interface ExpiringPlan {
  id: string;
  student_id: string;
  student_name?: string;
  student_phone?: string | null;
  name: string;
  expiry_date: string;
  remaining_sessions: number;
}

interface HeatCell {
  day: number;   // 0=Mon ... 6=Sun (we re-map)
  hour: number;  // 8..20
  count: number;
}

interface MissingEvalRow {
  student_id: string;
  student_name?: string;
  last_eval?: string | null;
}

interface MissingNutriRow {
  student_id: string;
  student_name?: string;
  student_phone?: string | null;
}

const MONTHS_ES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function getFormattedDate() {
  const today = new Date();
  return `${today.getDate()} de ${MONTHS_ES[today.getMonth()]}, ${today.getFullYear()}`;
}

function whatsappUrl(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, "");
  if (digits.length < 8) return null;
  const withCountry = digits.startsWith("56") ? digits : `56${digits}`;
  return `https://wa.me/${withCountry}`;
}

function daysFromNow(dateIso: string): number {
  const target = new Date(dateIso + "T00:00:00").getTime();
  return Math.ceil((target - Date.now()) / 86_400_000);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

function StatCard({ label, value, unit, hint, icon, color = "cyan" }: {
  label: string; value: string | number; unit?: string; hint?: string;
  icon: React.ReactNode; color?: "cyan" | "amber" | "emerald" | "red" | "purple";
}) {
  const colorClass = {
    cyan: "text-[#00d4ff] bg-[#00d4ff]/10",
    amber: "text-amber-400 bg-amber-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    red: "text-red-400 bg-red-500/10",
    purple: "text-purple-400 bg-purple-500/10",
  }[color];
  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-500 text-xs font-inter uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClass}`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-white font-montserrat leading-none tabular-nums">{value}</span>
        {unit && <span className="text-gray-400 text-sm">{unit}</span>}
      </div>
      {hint && <p className="text-[10px] text-gray-500 font-inter mt-2">{hint}</p>}
    </div>
  );
}

interface DashboardSectionProps {
  onNavigate?: (tab: string) => void;
}

export default function DashboardSection({ onNavigate }: DashboardSectionProps = {}) {
  const { user, isAdmin } = useAuth();
  const [overview, setOverview] = useState<TodayOverview | null>(null);
  const [nextClasses, setNextClasses] = useState<NextClass[]>([]);
  const [cancelled, setCancelled] = useState<CancelledClass[]>([]);
  const [expiring, setExpiring] = useState<ExpiringPlan[]>([]);
  const [heat, setHeat] = useState<HeatCell[]>([]);
  const [assignedCount, setAssignedCount] = useState<number | null>(null);
  const [missingEvals, setMissingEvals] = useState<MissingEvalRow[]>([]);
  const [missingNutri, setMissingNutri] = useState<MissingNutriRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const handleQuickAttendance = async (bookingId: string, attended: boolean) => {
    setUpdating(bookingId);
    const r = await confirmBookingAttendance(bookingId, attended);
    if (r.success) {
      toast.success(attended
        ? (r.consumedFromPlan ? "Asistencia confirmada · 1 clase descontada" : "Asistencia confirmada")
        : "Marcado como ausente");
      setNextClasses((cur) =>
        cur.map((c) => (c.id === bookingId ? { ...c, attended } : c)),
      );
    } else {
      toast.error(`Error: ${r.error}`);
    }
    setUpdating(null);
  };

  useEffect(() => {
    if (!user?.id) return;
    let cancelledFlag = false;

    (async () => {
      setLoading(true);
      const todayIso = new Date().toISOString().split("T")[0];
      const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0];
      const sevenAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
      const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString().split("T")[0];

      // Admins see global scope; teachers are scoped to their own bookings.
      const nextQ = supabase
        .from("bookings")
        .select("id, booking_date, start_time, end_time, student_id, attended, student:profiles!bookings_student_id_fkey(full_name)")
        .eq("status", "confirmed")
        .gte("booking_date", todayIso)
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(8);
      if (!isAdmin) nextQ.eq("professional_id", user.id);

      const cancQ = supabase
        .from("bookings")
        .select("id, booking_date, start_time, cancelled_at, notes, student_id, student:profiles!bookings_student_id_fkey(full_name, phone)")
        .eq("status", "cancelled")
        .gte("cancelled_at", sevenAgo)
        .order("cancelled_at", { ascending: false })
        .limit(8);
      if (!isAdmin) cancQ.eq("professional_id", user.id);

      const heatQ = supabase
        .from("bookings")
        .select("booking_date, start_time")
        .eq("status", "confirmed")
        .gte("booking_date", todayIso)
        .lte("booking_date", in14);
      if (!isAdmin) heatQ.eq("professional_id", user.id);

      const [
        ovRes,
        nextRes,
        cancRes,
        heatRes,
      ] = await Promise.all([
        getTodayOverview(user.id),
        nextQ,
        cancQ,
        heatQ,
      ]);

      if (cancelledFlag) return;

      if (ovRes.success) setOverview(ovRes.data || null);

      if (!nextRes.error && nextRes.data) {
        setNextClasses(
          nextRes.data.map((b: any) => ({ ...b, student_name: b.student?.full_name })),
        );
      }

      if (!cancRes.error && cancRes.data) {
        setCancelled(
          cancRes.data.map((b: any) => ({
            id: b.id,
            booking_date: b.booking_date,
            start_time: b.start_time,
            cancelled_at: b.cancelled_at,
            notes: b.notes,
            student_id: b.student_id,
            student_name: b.student?.full_name,
            student_phone: b.student?.phone,
          })),
        );
      }

      // Heat map aggregation
      if (!heatRes.error && heatRes.data) {
        const buckets = new Map<string, HeatCell>();
        for (const b of heatRes.data as Array<{ booking_date: string; start_time: string }>) {
          const d = new Date(b.booking_date + "T00:00:00");
          // Re-map JS day (0=Sun) → 0=Mon ... 6=Sun
          const jsDay = d.getDay();
          const day = jsDay === 0 ? 6 : jsDay - 1;
          const hour = parseInt(b.start_time.slice(0, 2), 10);
          if (hour < 8 || hour > 20) continue;
          const key = `${day}-${hour}`;
          const cur = buckets.get(key);
          if (cur) cur.count++;
          else buckets.set(key, { day, hour, count: 1 });
        }
        setHeat(Array.from(buckets.values()));
      }

      // Expiring plans + assigned students count: depend on scope (admin vs teacher)
      if (isAdmin) {
        const [planRes, studRes, allStudRes] = await Promise.all([
          supabase
            .from("plans")
            .select("id, student_id, name, expiry_date, remaining_sessions, student:profiles!plans_student_id_fkey(full_name, phone)")
            .eq("is_active", true)
            .gte("expiry_date", todayIso)
            .lte("expiry_date", in30)
            .order("expiry_date", { ascending: true })
            .limit(8),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "student"),
          supabase
            .from("profiles")
            .select("id, full_name")
            .eq("role", "student"),
        ]);

        if (!planRes.error && planRes.data) {
          setExpiring(
            planRes.data.map((p: any) => ({
              id: p.id,
              student_id: p.student_id,
              student_name: p.student?.full_name,
              student_phone: p.student?.phone,
              name: p.name,
              expiry_date: p.expiry_date,
              remaining_sessions: p.remaining_sessions,
            })),
          );
        }
        setAssignedCount(studRes.count ?? null);

        // Missing monthly evaluation
        const nameById = new Map<string, string>();
        for (const r of (allStudRes.data as { id: string; full_name: string }[]) || []) {
          nameById.set(r.id, r.full_name);
        }
        const ids = Array.from(nameById.keys());
        const [missRes, nutriRes] = await Promise.all([
          findStudentsMissingMonthlyEval(ids),
          findStudentsMissingNutritionBooking(ids),
        ]);
        if (missRes.success) {
          setMissingEvals(
            (missRes.data || []).slice(0, 8).map((r) => ({
              student_id: r.patient_id,
              student_name: nameById.get(r.patient_id),
              last_eval: r.last_eval,
            })),
          );
        }
        if (nutriRes.success) {
          setMissingNutri((nutriRes.data || []).slice(0, 8));
        }
      } else {
        // Teacher: derive assigned student ids from their bookings (last 60d + future)
        const sixtyAgo = new Date(Date.now() - 60 * 86_400_000).toISOString().split("T")[0];
        const sRes = await supabase
          .from("bookings")
          .select("student_id")
          .eq("professional_id", user.id)
          .gte("booking_date", sixtyAgo);

        const ids = Array.from(
          new Set(((sRes.data as { student_id: string }[]) || []).map((r) => r.student_id)),
        );
        setAssignedCount(ids.length);

        if (ids.length > 0) {
          const [planRes, nameRes, missRes, nutriRes] = await Promise.all([
            supabase
              .from("plans")
              .select("id, student_id, name, expiry_date, remaining_sessions, student:profiles!plans_student_id_fkey(full_name, phone)")
              .eq("is_active", true)
              .in("student_id", ids)
              .gte("expiry_date", todayIso)
              .lte("expiry_date", in30)
              .order("expiry_date", { ascending: true })
              .limit(8),
            supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", ids),
            findStudentsMissingMonthlyEval(ids),
            findStudentsMissingNutritionBooking(ids),
          ]);

          if (!planRes.error && planRes.data) {
            setExpiring(
              planRes.data.map((p: any) => ({
                id: p.id,
                student_id: p.student_id,
                student_name: p.student?.full_name,
                student_phone: p.student?.phone,
                name: p.name,
                expiry_date: p.expiry_date,
                remaining_sessions: p.remaining_sessions,
              })),
            );
          }

          const nameById = new Map<string, string>();
          for (const r of (nameRes.data as { id: string; full_name: string }[]) || []) {
            nameById.set(r.id, r.full_name);
          }
          if (missRes.success) {
            setMissingEvals(
              (missRes.data || []).slice(0, 8).map((r) => ({
                student_id: r.patient_id,
                student_name: nameById.get(r.patient_id),
                last_eval: r.last_eval,
              })),
            );
          }
          if (nutriRes.success) {
            setMissingNutri((nutriRes.data || []).slice(0, 8));
          }
        }
      }

      setLoading(false);
    })();

    return () => { cancelledFlag = true; };
  }, [user?.id, isAdmin]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat leading-tight">
            {isAdmin ? "Panel · Admin" : "Panel de Control"}
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            {isAdmin ? "Vista global del centro" : "Tu día y tus alumnos"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">FECHA DE HOY</p>
          <p className="text-[#0ea5e9] text-sm font-semibold font-lexend mt-0.5">{getFormattedDate()}</p>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Clases hoy" value={overview?.today_count ?? 0}
              icon={<CalendarClock className="w-5 h-5" />} color="cyan"
              hint={overview?.today_count ? "Confirmadas" : "Sin clases agendadas hoy"} />
            <StatCard label="Por confirmar asistencia" value={overview?.today_pending_attendance ?? 0}
              icon={<AlertTriangle className="w-5 h-5" />} color="amber"
              hint="De clases de hoy" />
            <StatCard label="Próximos 7 días" value={overview?.week_count ?? 0}
              icon={<Clock className="w-5 h-5" />} color="emerald"
              hint="Clases agendadas" />
            <StatCard
              label={isAdmin ? "Alumnos totales" : "Mis alumnos"}
              value={assignedCount ?? "—"}
              icon={<Users className="w-5 h-5" />} color="purple"
              hint={isAdmin ? "Registrados en el centro" : "Han agendado contigo (60d)"}
            />
          </div>

          {/* Próximas clases */}
          <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="text-white font-semibold font-lexend text-sm">Próximas clases</h2>
              {onNavigate ? (
                <button
                  onClick={() => onNavigate("calendar")}
                  className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-cyan-400 font-bold hover:gap-1.5 transition-all"
                >
                  Ver agenda completa <ArrowRight className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-[10px] text-gray-500 uppercase">Hasta 8 próximas</span>
              )}
            </div>
            {nextClasses.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No tienes clases programadas.</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {nextClasses.map((c) => {
                  const date = new Date(c.booking_date + "T00:00:00");
                  const isToday = c.booking_date === new Date().toISOString().split("T")[0];
                  const isUpdating = updating === c.id;
                  const pending = c.attended === null || c.attended === undefined;
                  return (
                    <div key={c.id} className="px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-4 hover:bg-white/[0.02] transition">
                      <div className="text-center w-11 flex-shrink-0">
                        <p className="text-[10px] uppercase text-gray-500">
                          {date.toLocaleDateString("es", { weekday: "short" })}
                        </p>
                        <p className={`text-lg font-bold tabular-nums ${isToday ? "text-[#00d4ff]" : "text-white"}`}>{date.getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold flex items-center gap-2 flex-wrap">
                          <span className="tabular-nums">{c.start_time.slice(0,5)} – {c.end_time.slice(0,5)}</span>
                          {isToday && (
                            <span className="text-[10px] uppercase bg-[#00d4ff]/15 text-[#00d4ff] px-1.5 py-0.5 rounded font-bold tracking-wider">
                              HOY
                            </span>
                          )}
                        </p>
                        <p className="text-gray-500 text-xs truncate mt-0.5">{c.student_name || "Alumno"}</p>
                      </div>
                      {c.attended === true && (
                        <span className="text-emerald-400 text-xs flex items-center gap-1 flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Asistió</span>
                        </span>
                      )}
                      {c.attended === false && (
                        <span className="text-red-400 text-xs flex-shrink-0">Ausente</span>
                      )}
                      {pending && isToday && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleQuickAttendance(c.id, true)}
                            disabled={isUpdating}
                            title="Confirmar asistencia"
                            className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-40"
                          >
                            {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleQuickAttendance(c.id, false)}
                            disabled={isUpdating}
                            title="Marcar ausente"
                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 hover:bg-red-500/20 transition disabled:opacity-40"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {pending && !isToday && (
                        <span className="text-gray-500 text-[10px] uppercase tracking-wider flex-shrink-0">
                          Próxima
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cancelaciones + Planes por vencer */}
          <div className="grid gap-4 lg:grid-cols-2">
            <CancellationsCard items={cancelled} />
            <ExpiringPlansCard items={expiring} />
          </div>

          {/* Heatmap full width */}
          <HourlyTrendCard cells={heat} />

          {/* Missing evals + Missing nutri */}
          <div className="grid gap-4 lg:grid-cols-2">
            <MissingEvalsCard items={missingEvals} />
            <MissingNutriCard items={missingNutri} />
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================
// Missing nutrition control booking
// =============================================================
function MissingNutriCard({ items }: { items: MissingNutriRow[] }) {
  return (
    <section className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Apple className="w-4 h-4 text-green-300" />
          <h2 className="text-white font-semibold font-lexend text-sm">Control nutricional pendiente</h2>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Este mes</span>
      </header>
      {items.length === 0 ? (
        <p className="p-8 text-center text-gray-500 text-sm">
          Todos los planes con nutri al día este mes.
        </p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {items.map((r) => {
            const wa = whatsappUrl(r.student_phone);
            return (
              <li key={r.student_id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{r.student_name || "Alumno"}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Sin cita con nutricionista este mes</p>
                </div>
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25 transition text-xs font-semibold flex-shrink-0 min-h-[40px]"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-gray-600 flex-shrink-0">Sin tel.</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// =============================================================
// Missing monthly evaluations
// =============================================================
function MissingEvalsCard({ items }: { items: MissingEvalRow[] }) {
  return (
    <section className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-purple-300" />
          <h2 className="text-white font-semibold font-lexend text-sm">Evaluación mensual pendiente</h2>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">+30 días</span>
      </header>
      {items.length === 0 ? (
        <p className="p-8 text-center text-gray-500 text-sm">Todos al día con su evaluación.</p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {items.map((r) => (
            <li key={r.student_id} className="px-4 sm:px-5 py-3">
              <p className="text-white text-sm font-medium truncate">{r.student_name || "Alumno"}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {r.last_eval ? (
                  <>Última: <span className="tabular-nums">{r.last_eval}</span></>
                ) : (
                  "Sin evaluaciones registradas"
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// =============================================================
// Cancellations
// =============================================================
function CancellationsCard({ items }: { items: CancelledClass[] }) {
  return (
    <section className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarX className="w-4 h-4 text-red-300" />
          <h2 className="text-white font-semibold font-lexend text-sm">Cancelaciones recientes</h2>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Últimos 7 días</span>
      </header>
      {items.length === 0 ? (
        <p className="p-8 text-center text-gray-500 text-sm">Sin cancelaciones esta semana.</p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {items.map((c) => {
            const wa = whatsappUrl(c.student_phone);
            return (
              <li key={c.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{c.student_name || "Alumno"}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    <span className="tabular-nums">{c.booking_date.slice(8,10)}/{c.booking_date.slice(5,7)}</span>
                    {" · "}
                    <span className="tabular-nums">{c.start_time.slice(0,5)}</span>
                    {" · "}
                    {c.cancelled_at && <span>{relativeTime(c.cancelled_at)}</span>}
                  </p>
                  {c.notes && (
                    <p className="text-gray-400 text-xs mt-1 line-clamp-1" title={c.notes}>
                      “{c.notes}”
                    </p>
                  )}
                </div>
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25 transition text-xs font-semibold flex-shrink-0 min-h-[40px]"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-gray-600 flex-shrink-0">Sin tel.</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// =============================================================
// Expiring plans
// =============================================================
function ExpiringPlansCard({ items }: { items: ExpiringPlan[] }) {
  return (
    <section className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
      <header className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-300" />
          <h2 className="text-white font-semibold font-lexend text-sm">Planes por vencer</h2>
        </div>
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Próx. 30 días</span>
      </header>
      {items.length === 0 ? (
        <p className="p-8 text-center text-gray-500 text-sm">Ningún plan vence en los próximos 30 días.</p>
      ) : (
        <ul className="divide-y divide-white/[0.04]">
          {items.map((p) => {
            const wa = whatsappUrl(p.student_phone);
            const days = daysFromNow(p.expiry_date);
            const tone =
              days <= 3 ? "text-red-300" :
              days <= 10 ? "text-amber-300" :
              "text-white/80";
            return (
              <li key={p.id} className="px-4 sm:px-5 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.student_name || "Alumno"}</p>
                  <p className="text-gray-500 text-xs mt-0.5 truncate">{p.name}</p>
                  <p className={`text-xs mt-1 ${tone}`}>
                    Vence en <span className="tabular-nums font-semibold">{days}</span> días
                    {" · "}
                    <span className="text-gray-500">{p.remaining_sessions} clases restantes</span>
                  </p>
                </div>
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25 transition text-xs font-semibold flex-shrink-0 min-h-[40px]"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </a>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-gray-600 flex-shrink-0">Sin tel.</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// =============================================================
// Tendencia horaria (gráfico de líneas) con filtro por día
// =============================================================
const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_FULL = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i); // 8..20

function HourlyTrendCard({ cells }: { cells: HeatCell[] }) {
  // -1 = "Todos los días". 0..6 = L..D
  const [dayFilter, setDayFilter] = useState<number>(-1);

  const total = useMemo(() => cells.reduce((s, c) => s + c.count, 0), [cells]);

  // Conteo por día → para deshabilitar chips de días sin actividad
  const totalsPerDay = useMemo(() => {
    const t = Array(7).fill(0);
    for (const c of cells) t[c.day] += c.count;
    return t;
  }, [cells]);

  // Serie horaria: para cada hora, suma de clases filtradas por día (o todas)
  const lineData = useMemo(() => {
    const byHour = new Map<number, number>();
    for (const h of HOURS) byHour.set(h, 0);
    for (const c of cells) {
      if (dayFilter !== -1 && c.day !== dayFilter) continue;
      byHour.set(c.hour, (byHour.get(c.hour) || 0) + c.count);
    }
    return HOURS.map((h) => ({
      hour: h,
      label: `${h}:00`,
      count: byHour.get(h) || 0,
    }));
  }, [cells, dayFilter]);

  const filteredTotal = lineData.reduce((s, p) => s + p.count, 0);
  const peak = lineData.reduce((best, p) => (p.count > best.count ? p : best), lineData[0]);

  return (
    <section className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
      <header className="px-4 sm:px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-4 h-4 text-[#00d4ff] flex-shrink-0" />
            <h2 className="text-white font-semibold font-lexend text-sm truncate">
              Tendencia horaria de clases
            </h2>
          </div>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider tabular-nums flex-shrink-0">
            {dayFilter === -1
              ? `${total} clases · próx. 14 días`
              : `${filteredTotal} en ${DAY_FULL[dayFilter]} · próx. 14 días`}
          </span>
        </div>

        {/* Chip filter — scroll horizontal en mobile, tap targets ≥40px */}
        <div
          className="mt-3 -mx-1 px-1 flex gap-1.5 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <DayChip
            label="Todos"
            active={dayFilter === -1}
            count={total}
            disabled={total === 0}
            onClick={() => setDayFilter(-1)}
          />
          {DAY_LABELS.map((d, idx) => (
            <DayChip
              key={d}
              label={d}
              active={dayFilter === idx}
              count={totalsPerDay[idx]}
              disabled={totalsPerDay[idx] === 0}
              onClick={() => setDayFilter(idx)}
            />
          ))}
        </div>
      </header>

      {total === 0 ? (
        <p className="p-8 text-center text-gray-500 text-sm">
          Sin clases agendadas en los próximos 14 días.
        </p>
      ) : filteredTotal === 0 ? (
        <p className="p-8 text-center text-gray-500 text-sm">
          Sin clases el {DAY_FULL[dayFilter]}.
        </p>
      ) : (
        <div className="px-2 sm:px-4 pt-4 pb-3">
          <div className="h-[200px] sm:h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lineData} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00d4ff" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(h) => `${h}h`}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(0,212,255,0.25)", strokeWidth: 1 }}
                  contentStyle={{
                    background: "#05050A",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                    padding: "6px 10px",
                  }}
                  labelStyle={{ color: "#9ca3af" }}
                  formatter={(v: any) => [`${v} ${v === 1 ? "clase" : "clases"}`, "Agendadas"]}
                  labelFormatter={(h: any) => `${h}:00`}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#00d4ff"
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  dot={{ fill: "#00d4ff", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: "#0f131a", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {peak && peak.count > 0 && (
            <p className="text-[11px] text-gray-500 px-3 pt-1 font-inter">
              Hora pico:{" "}
              <span className="text-white/90 tabular-nums font-semibold">
                {peak.hour}:00
              </span>{" "}
              · {peak.count} {peak.count === 1 ? "clase" : "clases"}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function DayChip({
  label,
  active,
  count,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`snap-start flex-shrink-0 inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-full text-xs font-semibold font-inter transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d4ff]/60 ${
        active
          ? "bg-[#00d4ff] text-[#05050A]"
          : disabled
          ? "bg-white/[0.03] text-gray-600 cursor-not-allowed"
          : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      <span>{label}</span>
      {count > 0 && !active && (
        <span className="text-[10px] text-gray-500 tabular-nums">{count}</span>
      )}
    </button>
  );
}

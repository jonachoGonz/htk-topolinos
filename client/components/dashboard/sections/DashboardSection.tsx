import { useEffect, useState } from "react";
import {
  CalendarClock, Users, AlertTriangle, Clock,
  CheckCircle2, Loader2, ArrowRight, Check, X,
} from "lucide-react";
import { toast } from "sonner";
import { SkeletonStat } from "@/components/dashboard/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTodayOverview, supabase, confirmBookingAttendance,
  type TodayOverview,
} from "@/services/supabase";

interface NextClass {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  student_id: string;
  student_name?: string;
  attended?: boolean | null;
}

function getFormattedDate() {
  const today = new Date();
  const months = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  return `${today.getDate()} de ${months[today.getMonth()]}, ${today.getFullYear()}`;
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
        <span className="text-3xl font-bold text-white font-montserrat leading-none">{value}</span>
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
  const { user } = useAuth();
  const [overview, setOverview] = useState<TodayOverview | null>(null);
  const [nextClasses, setNextClasses] = useState<NextClass[]>([]);
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
    (async () => {
      setLoading(true);
      const [ovRes, bookingsRes] = await Promise.all([
        getTodayOverview(user.id),
        supabase
          .from("bookings")
          .select("id, booking_date, start_time, end_time, student_id, attended, student:profiles!bookings_student_id_fkey(full_name)")
          .eq("professional_id", user.id)
          .eq("status", "confirmed")
          .gte("booking_date", new Date().toISOString().split("T")[0])
          .order("booking_date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(8),
      ]);

      if (ovRes.success) setOverview(ovRes.data || null);
      if (!bookingsRes.error && bookingsRes.data) {
        setNextClasses(
          bookingsRes.data.map((b: any) => ({
            ...b,
            student_name: b.student?.full_name,
          }))
        );
      }
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat leading-tight">Panel de Control</h1>
          <p className="text-gray-400 text-sm font-inter mt-1">Resumen de tu actividad de hoy</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">FECHA DE HOY</p>
          <p className="text-[#0ea5e9] text-sm font-semibold font-lexend mt-0.5">{getFormattedDate()}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStat key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard label="Clases hoy" value={overview?.today_count ?? 0}
              icon={<CalendarClock className="w-5 h-5" />} color="cyan"
              hint={overview?.today_count ? "Confirmadas" : "Sin clases agendadas hoy"} />
            <StatCard label="Por confirmar asistencia" value={overview?.today_pending_attendance ?? 0}
              icon={<AlertTriangle className="w-5 h-5" />} color="amber"
              hint="De clases de hoy" />
            <StatCard label="Próximos 7 días" value={overview?.week_count ?? 0}
              icon={<Clock className="w-5 h-5" />} color="emerald"
              hint="Clases agendadas" />
            <StatCard label="Alumnos activos (30d)" value={overview?.active_students_30d ?? 0}
              icon={<Users className="w-5 h-5" />} color="purple"
              hint="Han agendado contigo" />
          </div>

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
                  const date = new Date(c.booking_date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isUpdating = updating === c.id;
                  const pending = c.attended === null || c.attended === undefined;
                  return (
                    <div key={c.id} className="px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-4 hover:bg-white/[0.02] transition">
                      <div className="text-center w-11 flex-shrink-0">
                        <p className="text-[10px] uppercase text-gray-500">
                          {date.toLocaleDateString("es", { weekday: "short" })}
                        </p>
                        <p className={`text-lg font-bold ${isToday ? "text-[#00d4ff]" : "text-white"}`}>{date.getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold flex items-center gap-2 flex-wrap">
                          <span>{c.start_time.slice(0,5)} – {c.end_time.slice(0,5)}</span>
                          {isToday && (
                            <span className="text-[10px] uppercase bg-[#00d4ff]/15 text-[#00d4ff] px-1.5 py-0.5 rounded font-bold tracking-wider">
                              HOY
                            </span>
                          )}
                        </p>
                        <p className="text-gray-500 text-xs truncate mt-0.5">{c.student_name || "Alumno"}</p>
                      </div>
                      {/* Status badge OR quick action buttons */}
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
        </>
      )}
    </div>
  );
}

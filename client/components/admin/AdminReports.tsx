import { useEffect, useMemo, useState } from "react";
import {
  DollarSign, Users, Activity, CalendarClock,
  Package, Loader2, Pause, PieChart as PieIcon, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminOverview, getPlanDistribution, supabase,
  type AdminOverview, type PlanDistributionRow,
} from "@/services/supabase";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";

function StatCard({ label, value, hint, icon, color = "cyan" }: {
  label: string; value: string | number; hint?: string;
  icon: React.ReactNode;
  color?: "cyan" | "emerald" | "amber" | "purple" | "red";
}) {
  const c = {
    cyan: "text-[#00d4ff] bg-[#00d4ff]/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    purple: "text-purple-400 bg-purple-500/10",
    red: "text-red-400 bg-red-500/10",
  }[color];
  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-500 text-xs font-inter uppercase tracking-wider">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-white font-montserrat leading-none tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-gray-500 font-inter mt-2">{hint}</p>}
    </div>
  );
}

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

interface MonthRevenue { month: string; revenue: number; }
interface AttendanceDay { date: string; total: number; attended: number; }
interface DurationBucket { label: string; count: number; }
interface ProviderRow { provider: string; count: number; revenue: number; }

// Período del filtro de asistencia
type Range = "7d" | "30d" | "90d" | "365d";
const RANGE_LABEL: Record<Range, string> = {
  "7d": "Semana", "30d": "Mes", "90d": "Trimestre", "365d": "Año",
};
const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };

// Mapeo de meses recibidos por monthly_class_count → duración del plan
// Para 4 clases/mes, total_sessions = 4 * months. months = total / monthly.
function bucketDuration(months: number): string {
  if (months <= 1) return "Mensual";
  if (months <= 3) return "Trimestral";
  if (months <= 6) return "Semestral";
  return "Anual";
}

const PROVIDER_LABEL: Record<string, string> = {
  stripe: "Tarjeta (Stripe)",
  mercado_pago: "Mercado Pago",
  paypal: "PayPal",
};

export default function AdminReports() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [planDist, setPlanDist] = useState<PlanDistributionRow[]>([]);
  const [monthRevenue, setMonthRevenue] = useState<MonthRevenue[]>([]);
  const [attendanceByDay, setAttendanceByDay] = useState<AttendanceDay[]>([]);
  const [durationBuckets, setDurationBuckets] = useState<DurationBucket[]>([]);
  const [providerStats, setProviderStats] = useState<ProviderRow[]>([]);
  const [activeStudents30d, setActiveStudents30d] = useState<number>(0);
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // === Carga inicial: overview + planes + ingresos 6 meses + métodos pago + buckets ===
  useEffect(() => {
    (async () => {
      setLoading(true);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const sixMonthsAgoIso = sixMonthsAgo.toISOString();
      const thirtyAgoIso = new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0];

      const [ov, pd, payments, plansAll, activeBookings] = await Promise.all([
        getAdminOverview(),
        getPlanDistribution(),
        supabase
          .from("payments")
          .select("amount, created_at, provider, status")
          .eq("status", "succeeded")
          .gte("created_at", sixMonthsAgoIso),
        supabase
          .from("plans")
          .select("total_sessions, monthly_class_count, is_active")
          .eq("is_active", true),
        supabase
          .from("bookings")
          .select("student_id")
          .gte("booking_date", thirtyAgoIso)
          .eq("status", "confirmed"),
      ]);

      if (ov.success) setOverview(ov.data || null);
      else toast.error(`Error: ${ov.error}`);
      if (pd.success) setPlanDist(pd.data || []);

      // Ingresos mensuales (últimos 6 meses)
      const months: string[] = [];
      const monthKeys: string[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthKeys.push(key);
        months.push(d.toLocaleDateString("es-CL", { month: "short" }));
      }
      const revByMonth: Record<string, number> = {};
      const provByProvider: Record<string, { count: number; revenue: number }> = {};
      (payments.data || []).forEach((p: any) => {
        const key = p.created_at.slice(0, 7);
        revByMonth[key] = (revByMonth[key] || 0) + (p.amount || 0);
        const prov = p.provider || "otro";
        if (!provByProvider[prov]) provByProvider[prov] = { count: 0, revenue: 0 };
        provByProvider[prov].count++;
        provByProvider[prov].revenue += p.amount || 0;
      });
      setMonthRevenue(
        monthKeys.map((k, i) => ({ month: months[i], revenue: revByMonth[k] || 0 })),
      );
      setProviderStats(
        Object.entries(provByProvider)
          .map(([provider, v]) => ({ provider, count: v.count, revenue: v.revenue }))
          .sort((a, b) => b.revenue - a.revenue),
      );

      // Planes populares por duración
      const buckets: Record<string, number> = { Mensual: 0, Trimestral: 0, Semestral: 0, Anual: 0 };
      (plansAll.data || []).forEach((p: any) => {
        const monthly = p.monthly_class_count || 4;
        const total = p.total_sessions || monthly;
        const months = monthly > 0 ? Math.round(total / monthly) : 1;
        const label = bucketDuration(months);
        buckets[label] = (buckets[label] || 0) + 1;
      });
      setDurationBuckets(
        Object.entries(buckets).map(([label, count]) => ({ label, count })),
      );

      // Alumnos activos en últimos 30d (con al menos un booking confirmado)
      const uniqueStudents = new Set(
        ((activeBookings.data as { student_id: string }[]) || []).map((b) => b.student_id),
      );
      setActiveStudents30d(uniqueStudents.size);

      setLoading(false);
    })();
  }, []);

  // === Asistencia: recarga cuando cambia el rango ===
  useEffect(() => {
    (async () => {
      setAttendanceLoading(true);
      const days = RANGE_DAYS[range];
      const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("bookings")
        .select("booking_date, attended")
        .gte("booking_date", sinceIso)
        .order("booking_date");

      // Granularidad de bucket: si 365d → mensual; 90d → semanal; 30/7d → diaria
      const bucketByDate = (iso: string) => {
        if (days >= 365) return iso.slice(0, 7); // YYYY-MM
        if (days >= 90) {
          // semana (YYYY-Www aproximado: agrupar por primer día de semana ISO)
          const d = new Date(iso + "T00:00:00");
          const day = d.getDay();
          const diff = (day === 0 ? -6 : 1 - day);
          const monday = new Date(d);
          monday.setDate(d.getDate() + diff);
          return monday.toISOString().slice(0, 10);
        }
        return iso; // diario
      };

      const bMap: Record<string, AttendanceDay> = {};
      ((data as { booking_date: string; attended: boolean | null }[]) || []).forEach((b) => {
        const key = bucketByDate(b.booking_date);
        if (!bMap[key]) {
          const labelD = new Date((days >= 365 ? key + "-01" : key) + "T00:00:00");
          const label = days >= 365
            ? labelD.toLocaleDateString("es-CL", { month: "short" })
            : days >= 90
              ? `${labelD.getDate()}/${labelD.getMonth() + 1}`
              : key.slice(5);
          bMap[key] = { date: label, total: 0, attended: 0 };
        }
        bMap[key].total++;
        if (b.attended === true) bMap[key].attended++;
      });
      setAttendanceByDay(
        Object.entries(bMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([, v]) => v),
      );
      setAttendanceLoading(false);
    })();
  }, [range]);

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando reportes…
      </div>
    );
  }

  const attendanceRate = overview && overview.bookings_this_month > 0
    ? Math.round((overview.attended_this_month / overview.bookings_this_month) * 100)
    : null;

  const totalPlanSubs = planDist.reduce((sum, p) => sum + p.active_subscriptions, 0);
  const totalRevenue6m = monthRevenue.reduce((s, m) => s + m.revenue, 0);
  const totalDurationPlans = durationBuckets.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-montserrat">Reportes Generales</h2>
        <p className="text-gray-400 text-sm font-inter mt-1">
          Visión global del centro: ingresos, alumnos, ocupación y planes.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ingresos este mes"
          value={formatCLP(overview?.revenue_this_month ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
          hint="Suma de pagos exitosos"
        />
        <StatCard
          label="Alumnos activos"
          value={overview?.active_students ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="cyan"
          hint={`${overview?.total_students ?? 0} totales`}
        />
        <StatCard
          label="Activos último mes"
          value={activeStudents30d}
          icon={<Activity className="w-5 h-5" />}
          color="purple"
          hint="Alumnos con al menos 1 reserva confirmada (30 días)"
        />
        <StatCard
          label="Alumnos pausados"
          value={overview?.paused_students ?? 0}
          icon={<Pause className="w-5 h-5" />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Planes activos"
          value={overview?.active_plans ?? 0}
          icon={<Package className="w-5 h-5" />}
          color="cyan"
          hint="Suscripciones vigentes"
        />
        <StatCard
          label="Reservas mes"
          value={overview?.bookings_this_month ?? 0}
          icon={<CalendarClock className="w-5 h-5" />}
          color="emerald"
          hint={`${overview?.attended_this_month ?? 0} asistidas`}
        />
        <StatCard
          label="Tasa asistencia"
          value={attendanceRate != null ? `${attendanceRate}%` : "—"}
          icon={<Activity className="w-5 h-5" />}
          color={attendanceRate != null && attendanceRate >= 80 ? "emerald" : "red"}
        />
      </div>

      {/* Ingresos mensuales últimos 6 meses */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-white font-semibold font-lexend text-sm">
            Ingresos mensuales · últimos 6 meses
          </h3>
          <span className="text-[11px] text-gray-500 tabular-nums">
            Total acumulado: <span className="text-emerald-300 font-semibold">{formatCLP(totalRevenue6m)}</span>
          </span>
        </div>
        {monthRevenue.every((m) => m.revenue === 0) ? (
          <p className="py-8 text-center text-gray-500 text-sm">Aún sin pagos confirmados</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="month" stroke="#71717a" fontSize={11} />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
              />
              <Tooltip
                contentStyle={{ background: "#0a0e1a", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [formatCLP(v), "Ingresos"]}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Planes populares por duración + Métodos de pago */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-4">
          <h3 className="text-white font-semibold font-lexend text-sm mb-3">
            Planes contratados por duración
          </h3>
          {totalDurationPlans === 0 ? (
            <p className="py-8 text-center text-gray-500 text-sm">Sin planes activos</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={durationBuckets} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#71717a" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" stroke="#71717a" fontSize={11} width={80} />
                  <Tooltip
                    contentStyle={{ background: "#0a0e1a", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [`${v} ${v === 1 ? "plan" : "planes"}`, "Suscripciones"]}
                  />
                  <Bar dataKey="count" fill="#00d4ff" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[11px] text-gray-500 mt-2 tabular-nums text-center">
                Más popular:{" "}
                <span className="text-[#00d4ff] font-semibold">
                  {durationBuckets.reduce((best, d) => d.count > best.count ? d : best, durationBuckets[0]).label}
                </span>
              </p>
            </>
          )}
        </div>

        <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-amber-300" />
            <h3 className="text-white font-semibold font-lexend text-sm">
              Método de pago preferido
            </h3>
          </div>
          {providerStats.length === 0 ? (
            <p className="py-8 text-center text-gray-500 text-sm">
              Sin pagos confirmados en los últimos 6 meses
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {providerStats.map((p) => {
                const totalCount = providerStats.reduce((s, r) => s + r.count, 0);
                const pct = totalCount > 0 ? Math.round((p.count / totalCount) * 100) : 0;
                return (
                  <li key={p.provider} className="py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-white text-sm font-medium">
                        {PROVIDER_LABEL[p.provider] || p.provider}
                      </p>
                      <p className="text-amber-300 font-bold tabular-nums text-sm">{pct}%</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 tabular-nums">
                      <span>{p.count} {p.count === 1 ? "pago" : "pagos"}</span>
                      <span>{formatCLP(p.revenue)}</span>
                    </div>
                    <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden mt-1.5">
                      <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Asistencia con filtro de rango */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h3 className="text-white font-semibold font-lexend text-sm">
            Tendencia de asistencia
          </h3>
          <div className="flex gap-1.5 bg-white/[0.03] rounded-lg p-1">
            {(["7d", "30d", "90d", "365d"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  range === r
                    ? "bg-[#00d4ff] text-[#05050A]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        {attendanceLoading ? (
          <div className="py-12 flex items-center justify-center text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : attendanceByDay.length === 0 ? (
          <p className="py-8 text-center text-gray-500 text-sm">
            Sin reservas en este período
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={attendanceByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#0a0e1a", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="total" stroke="#71717a" name="Reservas" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="attended" stroke="#10b981" name="Asistió" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[11px] text-gray-500 mt-2 text-center">
              {range === "365d" ? "Agrupado por mes" : range === "90d" ? "Agrupado por semana" : "Diario"}
              {" · "}
              {attendanceByDay.reduce((s, d) => s + d.total, 0)} reservas ·{" "}
              {attendanceByDay.reduce((s, d) => s + d.attended, 0)} asistencias
            </p>
          </>
        )}
      </div>

      {/* Plan distribution (por nombre de plantilla) */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-white font-semibold font-lexend text-sm">Distribución de planes activos</h3>
        </div>
        {planDist.length === 0 ? (
          <p className="p-8 text-center text-gray-500 text-sm">Sin planes activos aún.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={planDist} dataKey="active_subscriptions" nameKey="template_name"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {planDist.map((_, i) => {
                      const colors = ["#00d4ff", "#10b981", "#f59e0b", "#a855f7", "#ec4899", "#3b82f6"];
                      return <Cell key={i} fill={colors[i % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0a0e1a", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {planDist.map((p) => {
                const pct = totalPlanSubs > 0 ? Math.round((p.active_subscriptions / totalPlanSubs) * 100) : 0;
                return (
                  <div key={p.template_id} className="px-3 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white text-sm font-semibold">{p.template_name}</p>
                        <p className="text-gray-500 text-xs">{p.monthly_classes} clases/mes</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#00d4ff] font-bold tabular-nums">{p.active_subscriptions}</p>
                        <p className="text-gray-500 text-[10px]">{pct}% del total</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#00d4ff] to-cyan-300 transition-all"
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

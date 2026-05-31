import { useEffect, useState } from "react";
import {
  DollarSign, Users, Activity, CalendarClock,
  Package, Loader2, Pause, PieChart as PieIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminOverview, getPlanDistribution, supabase,
  type AdminOverview, type PlanDistributionRow,
} from "@/services/supabase";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
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
      <p className="text-3xl font-bold text-white font-montserrat leading-none">{value}</p>
      {hint && <p className="text-[10px] text-gray-500 font-inter mt-2">{hint}</p>}
    </div>
  );
}

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

interface RevenueDay { date: string; revenue: number; }
interface AttendanceDay { date: string; total: number; attended: number; }

export default function AdminReports() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [planDist, setPlanDist] = useState<PlanDistributionRow[]>([]);
  const [revenueByDay, setRevenueByDay] = useState<RevenueDay[]>([]);
  const [attendanceByDay, setAttendanceByDay] = useState<AttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ov, pd, payments, bookings] = await Promise.all([
        getAdminOverview(),
        getPlanDistribution(),
        supabase
          .from("payments")
          .select("amount, created_at")
          .eq("status", "succeeded")
          .gte("created_at", new Date(Date.now() - 30*86400000).toISOString())
          .order("created_at"),
        supabase
          .from("bookings")
          .select("booking_date, attended, attendance_confirmed_at")
          .gte("booking_date", new Date(Date.now() - 30*86400000).toISOString().split("T")[0])
          .order("booking_date"),
      ]);

      if (ov.success) setOverview(ov.data || null);
      else toast.error(`Error: ${ov.error}`);
      if (pd.success) setPlanDist(pd.data || []);

      // Aggregate payments into per-day revenue
      const rMap: Record<string, number> = {};
      (payments.data || []).forEach((p: any) => {
        const d = p.created_at.split("T")[0];
        rMap[d] = (rMap[d] || 0) + (p.amount || 0);
      });
      setRevenueByDay(
        Object.entries(rMap).sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, revenue]) => ({ date: date.slice(5), revenue }))
      );

      // Aggregate bookings by date
      const bMap: Record<string, AttendanceDay> = {};
      (bookings.data || []).forEach((b: any) => {
        const d = b.booking_date;
        if (!bMap[d]) bMap[d] = { date: d.slice(5), total: 0, attended: 0 };
        bMap[d].total++;
        if (b.attended === true) bMap[d].attended++;
      });
      setAttendanceByDay(Object.values(bMap).sort((a, b) => a.date.localeCompare(b.date)));

      setLoading(false);
    })();
  }, []);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white font-montserrat">Reportes Generales</h2>
        <p className="text-gray-400 text-sm font-inter mt-1">
          Visión global del centro: ingresos, alumnos, ocupación y planes.
        </p>
      </div>

      {/* Revenue + students */}
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
          label="Alumnos pausados"
          value={overview?.paused_students ?? 0}
          icon={<Pause className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          label="Profesionales"
          value={overview?.total_teachers ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Activity stats */}
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

      {/* Revenue chart (last 30 days) */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-4">
        <h3 className="text-white font-semibold font-lexend text-sm mb-3">Ingresos últimos 30 días</h3>
        {revenueByDay.length === 0 ? (
          <p className="py-8 text-center text-gray-500 text-sm">Aún sin pagos en este período</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#0a0e1a", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [formatCLP(v), "Ingresos"]} />
              <Line type="monotone" dataKey="revenue" stroke="#00d4ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Attendance chart */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-4">
        <h3 className="text-white font-semibold font-lexend text-sm mb-3">Asistencias últimos 30 días</h3>
        {attendanceByDay.length === 0 ? (
          <p className="py-8 text-center text-gray-500 text-sm">Sin asistencias confirmadas</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={attendanceByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0a0e1a", border: "1px solid #ffffff20", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total" stroke="#71717a" name="Reservas" strokeWidth={2} />
              <Line type="monotone" dataKey="attended" stroke="#10b981" name="Asistió" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Plan distribution */}
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
                      <p className="text-[#00d4ff] font-bold">{p.active_subscriptions}</p>
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

      <div className="text-center">
        <p className="text-[10px] text-gray-600 italic">
          Tip: para reportes detallados con date range y export CSV/PDF, ver pestaña de Analytics (próximamente).
        </p>
      </div>
    </div>
  );
}

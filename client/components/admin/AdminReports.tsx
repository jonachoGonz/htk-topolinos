import { useEffect, useState } from "react";
import {
  DollarSign, Users, Activity, CalendarClock, TrendingUp,
  Package, Loader2, Pause, PieChart,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminOverview, getPlanDistribution,
  type AdminOverview, type PlanDistributionRow,
} from "@/services/supabase";

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

export default function AdminReports() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [planDist, setPlanDist] = useState<PlanDistributionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [ov, pd] = await Promise.all([getAdminOverview(), getPlanDistribution()]);
      if (ov.success) setOverview(ov.data || null);
      else toast.error(`Error: ${ov.error}`);
      if (pd.success) setPlanDist(pd.data || []);
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

      {/* Plan distribution */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <PieChart className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-white font-semibold font-lexend text-sm">Distribución de planes activos</h3>
        </div>
        {planDist.length === 0 ? (
          <p className="p-8 text-center text-gray-500 text-sm">Sin planes activos aún.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {planDist.map((p) => {
              const pct = totalPlanSubs > 0 ? Math.round((p.active_subscriptions / totalPlanSubs) * 100) : 0;
              return (
                <div key={p.template_id} className="px-5 py-3">
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

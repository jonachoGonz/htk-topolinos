import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  Activity,
  DollarSign,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { getAnalytics, type DateRangeMetrics } from "@/services/analytics";

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<DateRangeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    const result = await getAnalytics(dateRange.startDate, dateRange.endDate);
    if (result.success && result.data) {
      setAnalytics(result.data);
    } else {
      toast.error(`Error al cargar analytics: ${result.error}`);
    }
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100) / 100}%`;
  };

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white font-lexend mb-4">
          Período de Análisis
        </h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-xs font-inter text-gray-400 uppercase">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-xs font-inter text-gray-400 uppercase">
              Fecha Fin
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchAnalytics}
              disabled={isLoading}
              className="w-full md:w-auto px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg transition font-semibold text-sm disabled:opacity-50"
            >
              {isLoading ? "Cargando..." : "Actualizar"}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-12 text-center text-gray-500">
          Cargando datos...
        </div>
      ) : !analytics ? (
        <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-12 text-center text-gray-500">
          Sin datos disponibles
        </div>
      ) : (
        <>
          {/* Revenue Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-inter text-gray-400 uppercase">
                  Ingresos Totales
                </h3>
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(analytics.revenue.totalRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.revenue.successfulPayments} pagos exitosos
              </p>
            </div>

            <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-inter text-gray-400 uppercase">
                  Tasa de Éxito
                </h3>
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {formatPercentage(analytics.revenue.successRate)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Pagos procesados exitosamente
              </p>
            </div>

            <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-inter text-gray-400 uppercase">
                  Estudiantes Activos
                </h3>
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {analytics.users.activeStudents}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {analytics.users.newStudentsThisMonth} nuevos este período
              </p>
            </div>

            <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-inter text-gray-400 uppercase">
                  Profesores
                </h3>
                <Activity className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-white">
                {analytics.users.totalTeachers}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {formatPercentage(analytics.users.churnRate)} churn rate
              </p>
            </div>
          </div>

          {/* Utilization Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white font-lexend mb-4">
                Utilización
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    Sesiones Promedio por Estudiante
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.utilization.avgSessionsPerStudent}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    Tasa de Finalización
                  </p>
                  <p className="text-2xl font-bold text-white">
                    {formatPercentage(analytics.utilization.sessionCompletionRate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">
                    Día de Mayor Demanda
                  </p>
                  <p className="text-lg font-semibold text-white capitalize">
                    {analytics.utilization.peakBookingDay}
                  </p>
                </div>
              </div>
            </div>

            {/* Plan Distribution */}
            <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white font-lexend mb-4">
                Distribución de Planes
              </h3>
              <div className="space-y-3">
                {analytics.planDistribution.length === 0 ? (
                  <p className="text-gray-500 text-sm">Sin datos de planes</p>
                ) : (
                  analytics.planDistribution.map((plan, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {plan.planName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {plan.activeCount} estudiante{plan.activeCount !== 1 ? "s" : ""} activo{plan.activeCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-green-400">
                        {formatCurrency(plan.revenue)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white font-lexend mb-4">
              Detalles Adicionales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Pagos Fallidos</p>
                <p className="text-xl font-bold text-red-400">
                  {analytics.revenue.failedPayments}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Reembolsos</p>
                <p className="text-xl font-bold text-orange-400">
                  {formatCurrency(analytics.revenue.refundedAmount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">Tasa de Churn</p>
                <p className="text-xl font-bold text-purple-400">
                  {formatPercentage(analytics.users.churnRate)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

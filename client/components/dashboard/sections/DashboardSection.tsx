import { TrendingUp, AlertTriangle, CalendarClock } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  trendPositive?: boolean;
  icon?: React.ReactNode;
}

function StatCard({ label, value, unit, trend, trendPositive, icon }: StatCardProps) {
  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs font-inter uppercase tracking-wider mb-2">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white font-montserrat leading-none">{value}</span>
            {unit && <span className="text-gray-400 text-sm font-inter">{unit}</span>}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-inter ${trendPositive ? "text-emerald-400" : "text-rose-400"}`}>
              <TrendingUp className="w-3 h-3" />
              {trend}
            </div>
          )}
        </div>
        {icon && (
          <div className="text-[#00d4ff]/20">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function getFormattedDate() {
  const today = new Date();
  const months = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
  ];
  return `${today.getDate()} de ${months[today.getMonth()]}, ${today.getFullYear()}`;
}

export default function DashboardSection() {
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat leading-tight">
            Panel de Control
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Resumen de tu actividad
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-gray-500 font-inter uppercase tracking-widest">
            FECHA DE HOY
          </p>
          <p className="text-[#0ea5e9] text-sm font-semibold font-lexend mt-0.5">
            {getFormattedDate()}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Ratio de Asistencia Semanal"
          value="94%"
          trend="+2.4% vs semana pasada"
          trendPositive
          icon={<TrendingUp className="w-10 h-10" />}
        />
        <StatCard
          label="Alertas de Ausencia"
          value="2"
          unit="estudiantes"
          icon={<AlertTriangle className="w-10 h-10" />}
        />
        <StatCard
          label="Sesiones Restantes"
          value="08"
          unit="del ciclo"
          icon={<CalendarClock className="w-10 h-10" />}
        />
      </div>
    </div>
  );
}

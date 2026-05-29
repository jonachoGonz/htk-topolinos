import { useEffect, useState } from "react";
import { CalendarClock, BookOpen, Clock } from "lucide-react";
import { getStudentPlan, getStudentBookings, type Plan, type BookingRecord } from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "red";
}

function StatCard({ label, value, unit, icon, color = "blue" }: StatCardProps) {
  const colorClasses = {
    blue: "text-[#00d4ff]",
    green: "text-emerald-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs font-inter uppercase tracking-wider mb-2">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold font-montserrat leading-none ${colorClasses[color]}`}>
              {value}
            </span>
            {unit && <span className="text-gray-400 text-sm font-inter">{unit}</span>}
          </div>
        </div>
        {icon && <div className="text-[#00d4ff]/20">{icon}</div>}
      </div>
    </div>
  );
}

function getFormattedDate() {
  const today = new Date();
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return `${today.getDate()} de ${months[today.getMonth()]}, ${today.getFullYear()}`;
}

export default function StudentDashboardSection() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    setIsLoading(true);

    // Fetch plan
    const planResult = await getStudentPlan(user.id);
    if (planResult.success && planResult.data) {
      setPlan(planResult.data);
    }

    // Fetch upcoming bookings
    const bookingsResult = await getStudentBookings(user.id, "confirmed");
    if (bookingsResult.success) {
      setBookings(bookingsResult.data || []);
    }

    setIsLoading(false);
  };

  const daysUntilExpiry = plan
    ? Math.ceil(
        (new Date(plan.expiry_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  const sessionsUsed = plan ? plan.total_sessions - plan.remaining_sessions : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat leading-tight">
            Mi Panel
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Resumen de tu actividad y plan actual
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

      {/* Plan Info Card */}
      {plan && (
        <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white font-lexend">
                {plan.name}
              </h2>
              <p className="text-gray-400 text-sm font-inter mt-1">
                Plan activo
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-500 font-inter uppercase tracking-wider">
                  Sesiones Usadas
                </p>
                <p className="text-2xl font-bold text-[#00d4ff] font-lexend mt-1">
                  {sessionsUsed}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-inter uppercase tracking-wider">
                  Restantes
                </p>
                <p className="text-2xl font-bold text-emerald-400 font-lexend mt-1">
                  {plan.remaining_sessions}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-inter uppercase tracking-wider">
                  Vencimiento
                </p>
                <p className={`text-sm font-semibold font-lexend mt-1 ${
                  daysUntilExpiry <= 7 ? "text-red-400" : "text-white"
                }`}>
                  {daysUntilExpiry} días
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 font-inter">Progreso</span>
              <span className="text-xs text-gray-400 font-inter">
                {sessionsUsed}/{plan.total_sessions}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00d4ff] to-emerald-400 transition-all"
                style={{
                  width: `${(sessionsUsed / plan.total_sessions) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Sesiones Próximas"
          value={String(bookings.length)}
          unit="confirmadas"
          icon={<BookOpen className="w-10 h-10" />}
          color="blue"
        />
        <StatCard
          label="Tiempo Restante"
          value={plan ? String(daysUntilExpiry) : "—"}
          unit={plan ? "días" : ""}
          icon={<Clock className="w-10 h-10" />}
          color={daysUntilExpiry <= 7 ? "red" : "green"}
        />
        <StatCard
          label="Plan Activo"
          value={plan ? "Sí" : "No"}
          unit={plan ? plan.name : ""}
          icon={<CalendarClock className="w-10 h-10" />}
          color="green"
        />
      </div>

      {/* Upcoming Sessions */}
      {!isLoading && bookings.length > 0 && (
        <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-lg font-semibold text-white font-lexend">
              Próximas Sesiones
            </h3>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{booking.booked_at}</p>
                  <p className="text-gray-400 text-sm font-inter mt-1">
                    Estado: <span className="text-emerald-400">Confirmada</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center text-gray-500 py-8">
          Cargando información...
        </div>
      )}
    </div>
  );
}

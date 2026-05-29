import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { getPlanHistory, type Plan } from "@/services/supabase";

interface StudentPaymentSectionProps {
  studentId: string;
}

export default function StudentPaymentSection({ studentId }: StudentPaymentSectionProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    fetchPlans();
  }, [studentId]);

  const fetchPlans = async () => {
    if (!studentId) return;
    setIsLoading(true);
    const result = await getPlanHistory(studentId);
    if (result.success) {
      setPlans(result.data || []);
    }
    setIsLoading(false);
  };

  const getStatusBadge = (plan: Plan) => {
    if (!plan.is_active) {
      return <span className="text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded">Vencido</span>;
    }
    const daysLeft = Math.ceil(
      (new Date(plan.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 7) {
      return <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded">Por Vencer</span>;
    }
    return <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">Activo</span>;
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-[#00d4ff] mt-1" />
        <div>
          <h1 className="text-2xl font-bold text-white font-montserrat">
            Pagos y Planes
          </h1>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Historial de suscripciones y planes activos
          </p>
        </div>
      </div>

      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white font-lexend">
            Mis Planes
          </h2>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Cargando planes...
          </div>
        ) : plans.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Sin planes registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.06]">
                <tr className="text-left text-xs font-inter text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Nombre del Plan</th>
                  <th className="px-6 py-3">Sesiones</th>
                  <th className="px-6 py-3">Restantes</th>
                  <th className="px-6 py-3">Vencimiento</th>
                  <th className="px-6 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-white/[0.02] transition text-white">
                    <td className="px-6 py-3 font-medium">{plan.name}</td>
                    <td className="px-6 py-3">{plan.total_sessions}</td>
                    <td className="px-6 py-3">
                      <span className="font-semibold text-[#00d4ff]">
                        {plan.remaining_sessions}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400">
                      {new Date(plan.expiry_date).toLocaleDateString("es-CL")}
                    </td>
                    <td className="px-6 py-3">
                      {getStatusBadge(plan)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Renewal Notice */}
      {plans.some((p) => p.is_active) && (
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-blue-300 font-inter">
            💡 <strong>Próximamente:</strong> Podrás renovar tu plan directamente desde esta sección. Por ahora, contacta con tu profesor para renovar.
          </p>
        </div>
      )}
    </div>
  );
}

import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import PricingPlans from "@/components/payments/PricingPlans";

export default function Pricing() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not logged in
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  if (!token) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate("/dashboard/student")}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 mb-4"
          >
            ← Volver al dashboard
          </button>
          <h1 className="text-3xl font-bold">Planes de Suscripción</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Elige el mejor plan para tu formación
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PricingPlans
          token={token}
          onSubscriptionCreated={(subscriptionId) => {
            navigate("/dashboard/student?tab=pagos&subscription=" + subscriptionId);
          }}
        />
      </div>
    </div>
  );
}

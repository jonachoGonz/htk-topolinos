import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PlanTemplate, PromoCode } from "../../shared/api";
import AdminPlanForm from "@/components/admin/AdminPlanForm";
import AdminPromoCodesForm from "@/components/admin/AdminPromoCodesForm";
import AdminAnalytics from "@/components/admin/AdminAnalytics";

export default function AdminPanel() {
  const { user, token, userRole } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanTemplate[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanTemplate | null>(null);
  const [showPlanForm, setShowPlanForm] = useState(false);

  useEffect(() => {
    // Only admins and teachers can access
    if (!user) {
      navigate("/login");
    } else if (userRole !== "admin" && userRole !== "teacher") {
      navigate("/dashboard/student");
    }
  }, [user, userRole, navigate]);

  useEffect(() => {
    if (token && (userRole === "admin" || userRole === "teacher")) {
      loadData();
    }
  }, [token, userRole]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load plans
      const plansRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/plans`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (plansRes.ok) {
        setPlans(await plansRes.json());
      }

      // Load promo codes (admin only)
      if (userRole === "admin") {
        const promoRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/admin/promo-codes`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (promoRes.ok) {
          setPromoCodes(await promoRes.json());
        }
      }
    } catch (error) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  if (!token || (userRole !== "admin" && userRole !== "teacher")) {
    return <div>Acceso denegado</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 mb-4"
          >
            ← Volver al dashboard
          </button>
          <h1 className="text-3xl font-bold">Panel Administrativo</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Gestión de planes y promociones
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="text-center py-12">Cargando...</div>
        ) : (
          <Tabs defaultValue="plans" className="space-y-6">
            <TabsList>
              <TabsTrigger value="plans">Planes</TabsTrigger>
              {userRole === "admin" && (
                <>
                  <TabsTrigger value="promo-codes">Códigos Promo</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
                </>
              )}
            </TabsList>

            {/* Plans Tab */}
            <TabsContent value="plans" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Plans List */}
                <div className="lg:col-span-2">
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Tus Planes</h2>
                    {plans.length === 0 ? (
                      <p className="text-slate-500">
                        No has creado planes aún
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {plans.map((plan) => (
                          <div
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan)}
                            className={`p-4 border rounded-lg cursor-pointer transition ${
                              selectedPlan?.id === plan.id
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-semibold">{plan.name}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  {plan.sessions_per_month} sesiones/mes
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">
                                  ${(plan.price_per_month / 100).toLocaleString()} CLP
                                </div>
                                <div className="text-xs text-slate-500">
                                  {plan.is_active ? "✓ Activo" : "○ Inactivo"}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Plan Form */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <h2 className="text-lg font-semibold mb-4">
                    {selectedPlan ? "Editar Plan" : "Crear Plan"}
                  </h2>
                  <AdminPlanForm
                    token={token}
                    plan={selectedPlan || undefined}
                    onSuccess={(plan) => {
                      setSelectedPlan(null);
                      loadData();
                    }}
                  />
                  {selectedPlan && (
                    <Button
                      variant="outline"
                      className="w-full mt-3"
                      onClick={() => setSelectedPlan(null)}
                    >
                      Crear Nuevo
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Promo Codes Tab */}
            {userRole === "admin" && (
              <TabsContent value="promo-codes" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Promo Codes List */}
                  <div className="lg:col-span-2">
                    <div className="space-y-3">
                      <h2 className="text-lg font-semibold">
                        Códigos Promocionales
                      </h2>
                      {promoCodes.length === 0 ? (
                        <p className="text-slate-500">
                          No hay códigos promo creados
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {promoCodes.map((code) => (
                            <div
                              key={code.id}
                              className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-semibold font-mono">
                                    {code.code}
                                  </h3>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {code.discount_percent}% de descuento
                                  </p>
                                  <p className="text-xs text-slate-500 mt-1">
                                    Válido:{" "}
                                    {new Date(
                                      code.valid_from
                                    ).toLocaleDateString()}{" "}
                                    - {" "}
                                    {new Date(
                                      code.valid_until
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right text-sm">
                                  <div>
                                    {code.used_count}/{code.max_uses || "∞"} usos
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {code.max_uses && code.used_count >= code.max_uses
                                      ? "Agotado"
                                      : "Disponible"}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Promo Code Form */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-4">
                      Crear Código Promo
                    </h2>
                    <AdminPromoCodesForm
                      token={token}
                      onSuccess={() => loadData()}
                    />
                  </div>
                </div>
              </TabsContent>
            )}

            {/* Analytics Tab */}
            {userRole === "admin" && (
              <TabsContent value="analytics" className="space-y-6">
                <AdminAnalytics />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}

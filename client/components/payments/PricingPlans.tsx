import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getPlans, getPlanDetails } from "@/services/payments";
import { PlanTemplate, PlanDuration } from "../../../shared/api";
import StripeCheckout from "./StripeCheckout";

interface PricingPlansProps {
  token: string;
  onSubscriptionCreated?: (subscriptionId: string) => void;
}

export default function PricingPlans({
  token,
  onSubscriptionCreated,
}: PricingPlansProps) {
  const [plans, setPlans] = useState<PlanTemplate[]>([]);
  const [durations, setDurations] = useState<
    Record<string, PlanDuration[]>
  >({});
  const [selectedPlan, setSelectedPlan] = useState<PlanTemplate | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<
    1 | 3 | 6 | 12
  >(1);
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const planList = await getPlans();
        setPlans(planList);

        // Load durations for each plan
        const durationsMap: Record<string, PlanDuration[]> = {};
        for (const plan of planList) {
          const { durations: planDurations } = await getPlanDetails(plan.id);
          durationsMap[plan.id] = planDurations;
        }
        setDurations(durationsMap);

        if (planList.length > 0) {
          setSelectedPlan(planList[0]);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error loading plans"
        );
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin">Cargando planes...</div>
      </div>
    );
  }

  if (showCheckout && selectedPlan) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setShowCheckout(false)}
        >
          ← Volver a planes
        </Button>
        <StripeCheckout
          plan={selectedPlan}
          durationMonths={selectedDuration}
          token={token}
          onSuccess={(subscriptionId) => {
            setShowCheckout(false);
            setSelectedPlan(null);
            onSubscriptionCreated?.(subscriptionId);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Nuestros Planes</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Elige el plan que mejor se adapte a tus necesidades
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`border rounded-lg p-6 cursor-pointer transition ${
              selectedPlan?.id === plan.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}
            onClick={() => setSelectedPlan(plan)}
          >
            <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {plan.description}
            </p>

            <div className="mb-4">
              <div className="text-3xl font-bold">
                ${(plan.price_per_month / 100).toLocaleString()}
              </div>
              <div className="text-sm text-slate-500">por mes</div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded mb-4 text-sm">
              <strong>{plan.sessions_per_month}</strong> sesiones por mes
            </div>

            <Button
              className="w-full"
              onClick={() => setShowCheckout(true)}
              disabled={!selectedPlan || selectedPlan.id !== plan.id}
            >
              Seleccionar
            </Button>
          </div>
        ))}
      </div>

      {/* Duration Selection */}
      {selectedPlan && (
        <div className="space-y-3">
          <h3 className="font-semibold">Duración del plan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(durations[selectedPlan.id] || []).map((duration) => (
              <button
                key={duration.id}
                onClick={() =>
                  setSelectedDuration(
                    duration.duration_months as 1 | 3 | 6 | 12
                  )
                }
                className={`p-3 border rounded-lg text-center transition ${
                  selectedDuration === duration.duration_months
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="font-semibold">
                  {duration.duration_months}
                </div>
                <div className="text-xs text-slate-500">
                  {duration.discount_percent > 0 && (
                    <span className="text-green-600">
                      -{duration.discount_percent}%
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {selectedPlan && !showCheckout && (
        <Button
          size="lg"
          className="w-full"
          onClick={() => setShowCheckout(true)}
        >
          Proceder al pago
        </Button>
      )}
    </div>
  );
}

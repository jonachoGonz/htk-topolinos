import { useState, useEffect } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createPaymentIntent, getPaymentStatus } from "@/services/payments";
import { PlanTemplate } from "../../../shared/api";

let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise() {
  if (!stripePromise) {
    stripePromise = loadStripe(
      import.meta.env.VITE_STRIPE_PUBLIC_KEY || ""
    );
  }
  return stripePromise;
}

interface StripeCheckoutProps {
  plan: PlanTemplate;
  durationMonths: 1 | 3 | 6 | 12;
  token: string;
  onSuccess: (subscriptionId: string) => void;
}

function CheckoutForm({
  plan,
  durationMonths,
  token,
  onSuccess,
}: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [finalAmount, setFinalAmount] = useState(0);

  const calculatePrice = () => {
    const basePrice = plan.price_per_month * durationMonths;
    // TODO: Apply promo code discount
    setFinalAmount(basePrice);
  };

  useEffect(() => {
    calculatePrice();
  }, [plan, durationMonths, promoCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast.error("Stripe is not loaded");
      return;
    }

    setLoading(true);

    try {
      // Create payment intent
      const paymentResponse = await createPaymentIntent(token, {
        plan_template_id: plan.id,
        duration_months: durationMonths,
        promo_code: promoCode || undefined,
      });

      // Confirm payment with Stripe
      const result = await stripe.confirmCardPayment(
        paymentResponse.client_secret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              // Add billing details if needed
            },
          },
        }
      );

      if (result.error) {
        toast.error(result.error.message);
        setLoading(false);
        return;
      }

      // Payment successful - verify and get subscription
      const statusResponse = await getPaymentStatus(
        token,
        paymentResponse.payment_id
      );

      if (statusResponse.status === "succeeded") {
        toast.success(
          "¡Pago completado! Tu suscripción está activa."
        );
        onSuccess(statusResponse.subscription_id || paymentResponse.payment_id);
      } else {
        toast.error("Payment status pending. Please check your email.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Payment failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Plan Summary */}
      <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          {plan.description}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-sm">
            {plan.sessions_per_month} sesiones/mes × {durationMonths} meses
          </span>
          <span className="text-xl font-bold">
            ${(finalAmount / 100).toLocaleString()} CLP
          </span>
        </div>
      </div>

      {/* Promo Code */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Código promocional (opcional)
        </label>
        <Input
          type="text"
          placeholder="Ingresa tu código"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          disabled={loading}
        />
      </div>

      {/* Card Element */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Información de tarjeta
        </label>
        <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-900">
          <CardElement
            options={{
              style: {
                base: {
                  color: "currentColor",
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "16px",
                  "::placeholder": {
                    color: "#9ca3af",
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full"
        size="lg"
      >
        {loading ? "Procesando..." : "Pagar ahora"}
      </Button>

      {/* Terms */}
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
        Tus pagos están seguros con Stripe. Al continuar aceptas nuestros
        términos.
      </p>
    </form>
  );
}

export default function StripeCheckout({
  plan,
  durationMonths,
  token,
  onSuccess,
}: StripeCheckoutProps) {
  const stripePromise = getStripePromise();

  if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
        Configuración de Stripe no encontrada
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        plan={plan}
        durationMonths={durationMonths}
        token={token}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}

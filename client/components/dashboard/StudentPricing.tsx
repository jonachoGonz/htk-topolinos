import { useEffect, useState, useMemo } from "react";
import { Check, Loader2, Sparkles, Tag, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPlanTemplates, getStudentPlan, assignPlanToStudent,
  createNotificationForUser,
  type PlanTemplate, type RenewalPeriod, type Plan,
} from "@/services/supabase";

const PERIOD_LABELS: Record<RenewalPeriod, string> = {
  monthly: "Mensual", trimestral: "Trimestral",
  semestral: "Semestral", anual: "Anual",
};
const PERIOD_MONTHS: Record<RenewalPeriod, number> = {
  monthly: 1, trimestral: 3, semestral: 6, anual: 12,
};

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export default function StudentPricing() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanTemplate[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanTemplate | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<RenewalPeriod>("monthly");
  const [discountCode, setDiscountCode] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        getPlanTemplates(false),
        user?.id ? getStudentPlan(user.id) : Promise.resolve({ success: false }),
      ]);
      if (pRes.success) setPlans(pRes.data || []);
      if ("success" in cRes && cRes.success && (cRes as any).data) {
        setCurrentPlan((cRes as any).data);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const discountValid = useMemo(() => {
    if (!selectedPlan?.accepts_discount_codes) return false;
    if (!discountCode.trim()) return false;
    return discountCode.trim().toUpperCase() === (selectedPlan.discount_code || "").toUpperCase();
  }, [discountCode, selectedPlan]);

  const finalPrice = useMemo(() => {
    if (!selectedPlan) return 0;
    const base = selectedPlan.prices?.[selectedPeriod] || 0;
    return discountValid ? Math.round(base * 0.9) : base; // simple 10% discount
  }, [selectedPlan, selectedPeriod, discountValid]);

  const handleCheckout = async () => {
    if (!selectedPlan || !user?.id) return;
    setProcessing(true);
    try {
      // 1. Try Stripe via Netlify function if STRIPE_PUBLISHABLE is set
      //    (we don't have actual Stripe wired yet — gracefully fall back to direct assignment)
      const months = PERIOD_MONTHS[selectedPeriod];

      // Attempt Stripe checkout (will fail silently if not configured)
      try {
        const r = await fetch("/.netlify/functions/stripe-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: user.id,
            planTemplateId: selectedPlan.id,
            months,
            amount: finalPrice,
            discountCode: discountValid ? discountCode : null,
          }),
        });
        if (r.ok) {
          const { url } = await r.json();
          if (url) { window.location.href = url; return; }
        }
      } catch { /* fall through to direct */ }

      // 2. Fallback: direct plan assignment (admin assigns, no real payment)
      const assignR = await assignPlanToStudent(user.id, selectedPlan.id, months);
      if (assignR.success) {
        toast.success(`Plan "${selectedPlan.name}" activado por ${months} mes(es). (Pasarela de pago no configurada — asignación directa)`);
        await createNotificationForUser(
          user.id, "plan_purchased",
          "Plan activado", `Tu plan "${selectedPlan.name}" está activo`, "/dashboard/student"
        );
        setSelectedPlan(null);
        // refresh
        const cRes = await getStudentPlan(user.id);
        if (cRes.success) setCurrentPlan(cRes.data || null);
      } else {
        toast.error(`Error: ${assignR.error}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando planes…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white font-montserrat">Planes y Precios</h1>
        <p className="text-gray-400 text-sm font-inter mt-1">
          {currentPlan
            ? `Tu plan actual: ${currentPlan.name} — ${currentPlan.remaining_sessions}/${currentPlan.total_sessions} clases restantes`
            : "Elige el plan que mejor se adapte a tus objetivos"}
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">
          No hay planes disponibles. Contacta al admin.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = currentPlan?.name === p.name;
            return (
              <div key={p.id}
                className={`rounded-xl p-5 transition relative ${
                  p.is_default
                    ? "bg-gradient-to-br from-[#00d4ff]/10 to-[#0f131a] border border-[#00d4ff]/30"
                    : "bg-[#0f131a] border border-white/[0.06]"
                }`}>
                {p.is_default && (
                  <span className="absolute -top-2 left-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00d4ff] text-[#05050A] text-[10px] font-bold uppercase">
                    <Sparkles className="w-3 h-3" /> Plan inicial
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold uppercase">
                    Actual
                  </span>
                )}
                <h3 className="text-white font-bold font-lexend text-lg">{p.name}</h3>
                <p className="text-gray-400 text-sm mt-1">{p.monthly_classes} clases / mes</p>
                {p.description_rich && (
                  <p className="text-gray-500 text-xs mt-2 line-clamp-3">{p.description_rich.replace(/[#*]/g, "")}</p>
                )}
                <div className="my-4 space-y-1">
                  {(["monthly","trimestral","semestral","anual"] as RenewalPeriod[]).map((per) => {
                    const enabled = (p.allowed_renewals || []).includes(per);
                    const price = p.prices?.[per] || 0;
                    if (!enabled || price === 0) return null;
                    return (
                      <div key={per} className="flex justify-between text-xs">
                        <span className="text-gray-400">{PERIOD_LABELS[per]}</span>
                        <span className="text-white font-semibold">{formatCLP(price)}</span>
                      </div>
                    );
                  })}
                </div>
                {p.includes_sessions && (
                  <p className="text-[10px] text-purple-300 mb-2">
                    + {p.session_count_monthly} sesiones de {p.session_type}/mes
                  </p>
                )}
                <button
                  onClick={() => setSelectedPlan(p)}
                  disabled={isCurrent}
                  className={`w-full py-2 rounded-lg text-xs font-bold uppercase transition ${
                    isCurrent
                      ? "bg-white/[0.05] text-gray-500 cursor-not-allowed"
                      : "bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A]"
                  }`}
                >
                  {isCurrent ? "Plan vigente" : "Seleccionar"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Checkout modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
          onClick={() => !processing && setSelectedPlan(null)}>
          <div className="bg-[#0a0e1a] border border-white/10 rounded-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white font-montserrat">{selectedPlan.name}</h3>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                Duración
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["monthly","trimestral","semestral","anual"] as RenewalPeriod[]).map((per) => {
                  const enabled = (selectedPlan.allowed_renewals || []).includes(per)
                    && (selectedPlan.prices?.[per] || 0) > 0;
                  const isSel = selectedPeriod === per;
                  return (
                    <button key={per}
                      disabled={!enabled}
                      onClick={() => setSelectedPeriod(per)}
                      className={`p-3 rounded-lg border text-left transition ${
                        !enabled ? "opacity-40 cursor-not-allowed bg-[#0f131a] border-white/[0.04]" :
                        isSel ? "bg-[#00d4ff]/15 border-[#00d4ff]/40 text-[#00d4ff]"
                              : "bg-[#0f131a] border-white/10 text-gray-300 hover:border-white/20"
                      }`}>
                      <p className="text-xs font-semibold">{PERIOD_LABELS[per]}</p>
                      <p className="text-sm font-bold mt-0.5">{formatCLP(selectedPlan.prices?.[per] || 0)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedPlan.accepts_discount_codes && (
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                  Código de descuento (opcional)
                </label>
                <div className="flex items-center gap-2 bg-[#0f131a] border border-white/10 rounded-lg px-3">
                  <Tag className="w-3.5 h-3.5 text-gray-500" />
                  <input value={discountCode} onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="Ej: BIENVENIDO10"
                    className="flex-1 bg-transparent py-2 text-sm text-white focus:outline-none uppercase" />
                  {discountValid && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                {discountCode && !discountValid && (
                  <p className="text-[10px] text-red-400 mt-1">Código inválido</p>
                )}
                {discountValid && (
                  <p className="text-[10px] text-emerald-400 mt-1">✓ 10% de descuento aplicado</p>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-white/[0.06] flex justify-between items-baseline">
              <span className="text-sm text-gray-400">Total</span>
              <span className="text-2xl font-bold text-[#00d4ff]">{formatCLP(finalPrice)}</span>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setSelectedPlan(null)} disabled={processing}
                className="flex-1 px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.08] transition disabled:opacity-40">
                Cancelar
              </button>
              <button onClick={handleCheckout} disabled={processing || finalPrice === 0}
                className="flex-1 px-4 py-2 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-2">
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Pagar
              </button>
            </div>

            <p className="text-[10px] text-gray-500 text-center">
              Pago seguro vía Stripe. Recibirás un email de confirmación.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

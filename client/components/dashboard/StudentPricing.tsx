import { useEffect, useState, useMemo } from "react";
import { Check, Loader2, Sparkles, Tag, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPlanTemplates, getStudentPlan,
  supabase,
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

  // Feedback al volver de Mercado Pago o Khipu vía back_urls
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mp = params.get("mp");
    const kh = params.get("kh");
    if (!mp && !kh) return;
    if (mp === "success" || kh === "success") {
      toast.success("Pago confirmado. Tu plan se activará en unos segundos.");
    } else if (mp === "pending") {
      toast.message("Pago pendiente de confirmación bancaria.");
    } else if (mp === "failure" || kh === "cancel") {
      toast.error("El pago no se completó. Puedes intentarlo nuevamente.");
    }
    // Limpia los query params para no repetir el toast al recargar
    const cleanUrl = window.location.pathname + (params.get("tab") ? `?tab=${params.get("tab")}` : "");
    window.history.replaceState({}, "", cleanUrl);
  }, []);

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

  // Ambas pasarelas comparten el contrato: enviamos planTemplateId, period
  // y discountCode; el server crea el payment, llama a la pasarela y
  // devuelve la URL a la que redirigir al alumno.
  const PROVIDER_CONFIG = {
    mp:    { fn: "mp-create-preference", urlKey: "init_point" as const,   label: "Mercado Pago" },
    khipu: { fn: "khipu-create",         urlKey: "payment_url" as const,  label: "Khipu" },
  };
  type ProviderKey = keyof typeof PROVIDER_CONFIG;
  const [activeProvider, setActiveProvider] = useState<ProviderKey | null>(null);

  const handleCheckout = async (provider: ProviderKey) => {
    if (!selectedPlan || !user?.id) return;
    setActiveProvider(provider);
    setProcessing(true);
    const cfg = PROVIDER_CONFIG[provider];
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) {
        toast.error("Sesión expirada, vuelve a iniciar sesión.");
        return;
      }
      const r = await fetch(`/.netlify/functions/${cfg.fn}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planTemplateId: selectedPlan.id,
          period: selectedPeriod,
          discountCode: discountValid ? discountCode : null,
        }),
      });
      const json = await r.json().catch(() => ({}));
      const url = json[cfg.urlKey];
      if (!r.ok || !url) {
        toast.error(`Error con ${cfg.label}: ${json.error || `HTTP ${r.status}`}`);
        return;
      }
      window.location.href = url;
    } catch (e) {
      toast.error(`Error: ${String(e)}`);
    } finally {
      setProcessing(false);
      setActiveProvider(null);
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

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => handleCheckout("mp")} disabled={processing || finalPrice === 0}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-2 min-h-[44px]">
                  {processing && activeProvider === "mp"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CreditCard className="w-4 h-4" />}
                  Mercado Pago
                </button>
                <button onClick={() => handleCheckout("khipu")} disabled={processing || finalPrice === 0}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold transition disabled:opacity-40 flex items-center justify-center gap-2 min-h-[44px]">
                  {processing && activeProvider === "khipu"
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CreditCard className="w-4 h-4" />}
                  Khipu (transferencia)
                </button>
              </div>
              <button onClick={() => setSelectedPlan(null)} disabled={processing}
                className="w-full px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.08] transition disabled:opacity-40">
                Cancelar
              </button>
            </div>

            <p className="text-[10px] text-gray-500 text-center leading-relaxed">
              <strong className="text-gray-400">Mercado Pago:</strong> tarjetas, Webpay, transferencia.
              <br />
              <strong className="text-gray-400">Khipu:</strong> transferencia directa desde tu banco (comisión menor).
              <br />
              Tu plan se activa automáticamente al confirmarse el pago.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

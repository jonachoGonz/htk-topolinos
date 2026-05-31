import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPublicPlans, type PlanTemplate } from "@/services/supabase";

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-CL").format(n);
}

function extractBullets(p: PlanTemplate): string[] {
  const fromRich = (p.description_rich || "").split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- ") || l.startsWith("* "))
    .map((l) => l.replace(/^[-*]\s+/, ""));
  if (fromRich.length > 0) return fromRich;
  const bullets: string[] = [`${p.monthly_classes} clases mensuales`];
  if (p.includes_sessions && p.session_count_monthly > 0 && p.session_type) {
    bullets.push(`${p.session_count_monthly} sesiones de ${p.session_type}`);
  }
  if (p.accepts_discount_codes) bullets.push("Acepta códigos de descuento");
  if (p.allowed_renewals?.length > 1) {
    bullets.push(`Renovación: ${p.allowed_renewals.join(", ")}`);
  }
  return bullets;
}

export default function Pricing() {
  const [plans, setPlans] = useState<PlanTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getPublicPlans().then((r) => {
      if (r.success) setPlans(r.data || []);
      setLoading(false);
    });
  }, []);

  // Fallback when no plans configured: keep landing usable
  const showFallback = !loading && plans.length === 0;

  return (
    <section id="planes" className="w-full bg-[#0a0e1a] py-16 sm:py-20 lg:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-5">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <p className="text-xs uppercase font-semibold text-cyan-400 tracking-widest mb-3 sm:mb-4">
            Planes y Tarifas
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            ELIGE TU <span className="text-cyan-400">PLAN</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-400 max-w-2xl mx-auto px-2">
            Desde entrenamientos básicos hasta acompañamiento de élite. Encuentra
            el plan perfecto para ti o para tu equipo.
          </p>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando planes…
          </div>
        ) : showFallback ? (
          <div className="text-center text-gray-500 py-12">
            <p>Los planes están siendo actualizados.</p>
            <button onClick={() => navigate("/login")}
              className="mt-4 inline-block px-6 py-2.5 bg-cyan-400 text-[#0a0e1a] rounded-lg font-semibold hover:opacity-90">
              Contáctanos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {plans.map((plan) => {
              const monthlyPrice = plan.prices?.monthly ?? 0;
              const bullets = extractBullets(plan);
              const highlighted = !!plan.highlight;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-6 sm:p-8 border transition-all ${
                    highlighted
                      ? "bg-cyan-400 border-cyan-400 sm:scale-105 sm:shadow-xl sm:shadow-cyan-400/20"
                      : "bg-[#1a1f2e] border-[#2a2f3e]"
                  }`}
                >
                  {/* Badge */}
                  {highlighted && plan.badge_text && (
                    <div className="absolute -top-3 right-6 bg-[#0a0e1a] px-3 py-1.5 rounded-full text-[10px] font-bold text-cyan-400 uppercase tracking-wider whitespace-nowrap">
                      {plan.badge_text}
                    </div>
                  )}

                  {/* Name */}
                  <h3 className={`text-sm mb-2 ${highlighted ? "text-[#0a0e1a]" : "text-gray-400"}`}>
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className={`text-3xl sm:text-4xl font-bold mb-1 ${highlighted ? "text-[#0a0e1a]" : "text-white"}`}>
                    ${formatPrice(monthlyPrice)}
                    <span className={`text-sm sm:text-base font-normal ${highlighted ? "text-[#0a0e1a]/70" : "text-gray-400"}`}>
                      /mes
                    </span>
                  </div>
                  <p className={`text-xs sm:text-sm mb-6 sm:mb-8 ${highlighted ? "text-[#0a0e1a]/70" : "text-gray-400"}`}>
                    Plan mensual {plan.allowed_renewals?.length > 1 ? "· renovable" : ""}
                  </p>

                  {/* Features */}
                  <div className="space-y-2.5 sm:space-y-3 mb-6 sm:mb-8">
                    {bullets.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2.5 sm:gap-3">
                        <Check className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5 ${highlighted ? "text-[#0a0e1a]" : "text-cyan-400"}`} />
                        <span className={`text-xs sm:text-sm ${highlighted ? "text-[#0a0e1a]" : "text-gray-200"}`}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Button */}
                  <button onClick={() => navigate("/login")}
                    className={`w-full py-3 rounded-lg font-semibold text-sm sm:text-base transition ${
                      highlighted
                        ? "bg-[#0a0e1a] text-cyan-400 hover:opacity-90"
                        : "bg-transparent text-white border border-[#2a2f3e] hover:bg-[#1a1f2e]"
                    }`}>
                    {highlighted ? "SELECCIONAR" : "EMPEZAR AHORA"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

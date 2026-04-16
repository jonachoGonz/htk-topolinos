import { Check } from "lucide-react";

const plans = [
  {
    name: "Basic",
    price: "45.000",
    period: "/mes",
    highlighted: false,
    features: [
      "Acceso Entrenamiento",
      "Evaluación inicial",
      "Asesoramiento HTK",
    ],
  },
  {
    name: "Élite",
    price: "120.000",
    period: "/mes",
    highlighted: true,
    badge: "Más Popular",
    features: [
      "Todo en plan Básico",
      "Kinesiología y Nutrición",
      "Evaluación de alto nivel",
      "Seguimiento personalizado",
      "Análisis biomecánico",
    ],
  },
  {
    name: "Pro",
    price: "75.000",
    period: "/mes",
    highlighted: false,
    features: [
      "Clases en plan Básico",
      "Kinesiología y Nutrición",
      "Seguimiento semanal (LUNES)",
      "Acceso a biomecánica",
    ],
  },
];

export default function Pricing() {
  return (
    <section className="w-full bg-[#0a0e1a] py-20 sm:py-32">
      <div className="max-w-6xl mx-auto px-5">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-xs uppercase font-semibold text-cyan-400 tracking-widest mb-4">
            Planes y Tarifas
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            ELIGE TU <span className="text-cyan-400">PLAN</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
            Desde entrenamientos básicos hasta equipamiento de élite. Encuentra
            el plan perfecto para ti o para tu equipo.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 border transition-all ${
                plan.highlighted
                  ? "bg-cyan-400 border-cyan-400"
                  : "bg-[#1a1f2e] border-[#2a2f3e]"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 right-6 bg-[#0a0e1a] px-3 py-1.5 rounded-full text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  {plan.badge}
                </div>
              )}

              {/* Price */}
              <h3
                className={`text-sm mb-2 ${
                  plan.highlighted
                    ? "text-[#0a0e1a]"
                    : "text-gray-400"
                }`}
              >
                {plan.name}
              </h3>
              <div
                className={`text-4xl font-bold mb-1 ${
                  plan.highlighted ? "text-[#0a0e1a]" : "text-white"
                }`}
              >
                ${plan.price}
                <span
                  className={`text-base ${
                    plan.highlighted
                      ? "text-[#0a0e1a] opacity-70"
                      : "text-gray-400"
                  }`}
                >
                  {plan.period}
                </span>
              </div>
              <p
                className={`text-sm mb-8 ${
                  plan.highlighted
                    ? "text-[#0a0e1a] opacity-70"
                    : "text-gray-400"
                }`}
              >
                Plan mensual
              </p>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check
                      className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        plan.highlighted
                          ? "text-[#0a0e1a]"
                          : "text-cyan-400"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        plan.highlighted
                          ? "text-[#0a0e1a]"
                          : "text-gray-200"
                      }`}
                    >
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              {/* Button */}
              <button
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  plan.highlighted
                    ? "bg-[#0a0e1a] text-cyan-400 hover:opacity-90"
                    : "bg-transparent text-white border border-[#2a2f3e] hover:bg-[#1a1f2e]"
                }`}
              >
                {plan.highlighted ? "SELECCIONAR ÉLITE" : "EMPEZAR AHORA"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

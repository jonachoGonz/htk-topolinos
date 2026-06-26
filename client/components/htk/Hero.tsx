import { Star, Heart, Activity, Target, Clock, ChevronDown, ArrowRight } from "lucide-react";
import HERO_BG from "@/assets/home/hero-bg.webp";

// Diferenciales reales del centro — los números inflados (500+ atletas,
// 98% recuperación, 24/7) se sacaron porque no aplican: el centro es
// pequeño, recién iniciando, con foco en cercanía y plan personalizado.
const stats = [
  { icon: Heart,    value: "1 a 1",     label: "Atención personalizada" },
  { icon: Activity, value: "Tu deporte", label: "Adaptable a tu disciplina" },
  { icon: Target,   value: "Tu meta",    label: "Plan según tus objetivos" },
  { icon: Clock,    value: "L–V · 7–22h", label: "Sáb 09–18h" },
];

export default function Hero() {
  return (
    <section
      id="home"
      className="relative w-full overflow-hidden bg-[#0a0e1a]"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={HERO_BG}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center opacity-55"
          loading="eager"
          fetchPriority="high"
        />
        {/* Vignette + tint */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a]/70 via-[#0a0e1a]/55 to-[#0a0e1a]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,14,26,0.65)_75%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 lg:pt-36 pb-16 sm:pb-24">
        {/* Eyebrow chip */}
        <div className="flex justify-start mb-7">
          <span className="htk-chip htk-chip-accent">
            <Star className="w-3 h-3" fill="currentColor" />
            Centro de Alto Rendimiento
          </span>
        </div>

        {/* Display heading — magazine block */}
        <div className="max-w-5xl">
          <h1 className="htk-display text-[14vw] sm:text-[10vw] lg:text-[8.5rem] xl:text-[10rem] text-white leading-[0.85]">
            Rendimiento
            <br />
            <span className="text-cyan-400">de élite,</span>
            <br />
            ciencia clínica.
          </h1>
        </div>

        {/* Subhead + actions */}
        <div className="mt-8 sm:mt-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 lg:gap-12 items-end">
          <p className="htk-body max-w-xl">
            Kinesiología especializada, nutrición y entrenamiento integrado para
            deportistas y equipos que buscan maximizar su potencial.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/login"
              className="
                group inline-flex items-center gap-2 px-6 py-3.5
                bg-cyan-400 text-[#0a0e1a] font-bold text-sm rounded-full
                hover:bg-cyan-300 active:scale-[0.98] transition-all
                shadow-[0_8px_24px_-8px_rgba(0,212,255,0.6)]
              "
            >
              Agendar clase de prueba
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#servicios"
              className="
                inline-flex items-center gap-2 px-6 py-3.5
                bg-white/[0.06] backdrop-blur-sm text-white border border-white/15
                font-medium text-sm rounded-full hover:bg-white/[0.1] transition
              "
            >
              Conocer los servicios
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-14 sm:mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.06] border border-white/[0.08] rounded-2xl overflow-hidden backdrop-blur-sm">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex flex-col items-start gap-2 px-5 py-6 bg-[#0a0e1a]/80"
              >
                <Icon className="w-4 h-4 text-cyan-400" />
                <p className="htk-display text-3xl sm:text-4xl text-white">
                  {stat.value}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-[0.14em] font-medium">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Scroll hint */}
        <div className="hidden sm:flex justify-center mt-10 animate-bounce">
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </div>
      </div>
    </section>
  );
}

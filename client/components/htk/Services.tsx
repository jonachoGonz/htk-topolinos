import { Heart, Activity, Brain, Apple, Dumbbell, ArrowRight } from "lucide-react";

const services = [
  {
    title: "Evaluación Biomecánica",
    description:
      "Análisis preciso del movimiento para prevenir lesiones y optimizar el rendimiento deportivo.",
    icon: Heart,
    tag: "Diagnóstico",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Preparación Física",
    description:
      "Programas personalizados basados en evidencia científica con un enfoque individualizado.",
    icon: Activity,
    tag: "Entrenamiento",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Kinesiología Deportiva",
    description:
      "Recuperación funcional avanzada con tecnologías de última generación.",
    icon: Brain,
    tag: "Recuperación",
    image:
      "https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=900&q=80",
  },
];

const specialties = [
  { title: "Kinesiología", description: "Evaluación biomecánica, prevención y recuperación funcional.", icon: Brain },
  { title: "Nutrición", description: "Planes nutricionales personalizados para rendimiento y salud.", icon: Apple },
  { title: "Entrenamiento", description: "Alta intensidad para atletas y equipos de alto rendimiento.", icon: Dumbbell },
  { title: "Prep. Física", description: "Metodologías científicas específicas para cada deporte.", icon: Activity },
];

export default function Services() {
  return (
    <>
      {/* Core Services */}
      <section id="servicios" className="w-full bg-[#0f1420] py-16 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section header */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,420px)] gap-8 lg:gap-16 items-end mb-12 sm:mb-16">
            <div>
              <span className="htk-chip mb-5">+ Qué hacemos</span>
              <h2 className="htk-h2 text-white mt-4">
                Preparación de alto rendimiento
                <br />
                <span className="text-cyan-400">y kinesiología integral</span>
              </h2>
            </div>
            <p className="htk-body lg:text-right">
              Combinamos ciencia médica, tecnología deportiva y nutrición
              personalizada para deportistas que buscan maximizar su rendimiento.
            </p>
          </div>

          {/* Service Cards with cover images */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article
                  key={service.title}
                  className="
                    group relative bg-[#13182a] rounded-3xl overflow-hidden
                    border border-white/[0.06]
                    hover:border-cyan-400/30 transition-all
                    hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(0,212,255,0.25)]
                  "
                >
                  {/* Cover image */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={service.image}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#13182a] via-[#13182a]/40 to-transparent" />
                    <span className="absolute top-4 right-4 htk-chip htk-chip-accent backdrop-blur-md">
                      {service.tag}
                    </span>
                    <div className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-cyan-400/15 backdrop-blur-md border border-cyan-400/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-cyan-400" />
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 sm:p-7">
                    <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                      {service.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-5">
                      {service.description}
                    </p>
                    <a
                      href="/login"
                      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-cyan-400 font-bold hover:gap-2.5 transition-all"
                    >
                      Agendar <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section className="w-full bg-[#0a0e1a] py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-baseline justify-between mb-8 sm:mb-10">
            <span className="htk-chip">+ Nuestras especialidades</span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-gray-600">
              04 áreas
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {specialties.map((specialty) => {
              const Icon = specialty.icon;
              return (
                <div
                  key={specialty.title}
                  className="
                    group relative p-5 sm:p-6 rounded-2xl
                    bg-white/[0.02] border border-white/[0.06]
                    hover:border-cyan-400/25 hover:bg-white/[0.04]
                    transition
                  "
                >
                  <div className="w-11 h-11 bg-cyan-400/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-cyan-400/20 transition">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-base font-bold mb-1.5 text-white">{specialty.title}</h3>
                  <p className="text-gray-400 text-xs leading-relaxed">{specialty.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

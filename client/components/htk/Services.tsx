import { Heart, Activity, Brain, Apple, Dumbbell, ArrowRight } from "lucide-react";

const services = [
  {
    title: "Evaluación Biomecánica",
    description: "Análisis preciso del movimiento para prevenir lesiones y optimizar el rendimiento deportivo.",
    icon: Heart,
    tag: "Diagnóstico",
  },
  {
    title: "Preparación Física",
    description: "Programas personalizados basados en evidencia científica con un enfoque individualizado.",
    icon: Activity,
    tag: "Entrenamiento",
  },
  {
    title: "Kinesiología Deportiva",
    description: "Recuperación funcional avanzada con tecnologías de última generación.",
    icon: Brain,
    tag: "Recuperación",
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
      <section id="servicios" className="w-full bg-[#0f1420] py-14 sm:py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-xs uppercase font-semibold text-cyan-400 tracking-widest mb-3">
              Qué hacemos
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              Preparación de alto rendimiento
              <br className="hidden sm:block" />
              <span className="text-cyan-400"> y kinesiología integral</span>
            </h2>
            <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto mt-3 leading-relaxed">
              Combinamos ciencia médica, tecnología deportiva y nutrición personalizada
              para deportistas que buscan maximizar su rendimiento.
            </p>
          </div>

          {/* Service Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  className="group bg-[#1a1f2e] rounded-2xl p-6 sm:p-8 border border-[#2a2f3e] hover:border-cyan-400/30 transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 bg-cyan-400/10 rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-cyan-400/60 font-semibold border border-cyan-400/20 rounded-full px-2.5 py-1">
                      {service.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">{service.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-4">{service.description}</p>
                  <a href="/login" className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-semibold hover:gap-2.5 transition-all">
                    Agendar <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section className="w-full bg-[#0a0e1a] py-12 sm:py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <p className="text-center text-xs uppercase font-semibold text-gray-500 tracking-widest mb-8 sm:mb-10">
            Nuestras especialidades
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {specialties.map((specialty) => {
              const Icon = specialty.icon;
              return (
                <div key={specialty.title} className="text-center p-4 sm:p-6 rounded-2xl border border-white/[0.04] hover:border-cyan-400/20 transition">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-cyan-400/10 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold mb-1.5 sm:mb-2 text-white">{specialty.title}</h3>
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

import { CircleCheck } from "lucide-react";

const stats = [
  { label: "Atletas Entrenados", value: "500+" },
  { label: "Deportes Cubiertos", value: "15+" },
  { label: "Tasa de Recuperación", value: "98%" },
  { label: "Atención y Servicios", value: "24/7" },
];

const facilities = [
  {
    title: "Zona de Pesas",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Área Kinésica",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Cancha Exterior",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
  },
];

const ABOUT_IMG =
  "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1200&q=80";

export default function About() {
  return (
    <>
      {/* Stats Section */}
      <section id="about" className="w-full bg-[#0a0e1a] py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-left">
                <div className="htk-display text-5xl sm:text-6xl text-cyan-400 mb-2">
                  {stat.value}
                </div>
                <p className="text-[10px] sm:text-xs uppercase text-gray-400 font-semibold tracking-[0.18em]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="w-full bg-[#0f1420] py-16 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <span className="htk-chip mb-6 inline-flex">+ Sobre HTK</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center mt-5">
            {/* Image */}
            <div className="relative rounded-3xl overflow-hidden border border-white/[0.06] aspect-[4/5] md:aspect-[4/5]">
              <img
                src={ABOUT_IMG}
                alt="Atletas entrenando en HTK Center"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0f1420] to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between">
                <span className="htk-chip backdrop-blur-md bg-black/30">
                  Más de 8 años
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-gray-300">
                  Santiago · Chile
                </span>
              </div>
            </div>

            {/* Content */}
            <div>
              <h2 className="htk-h2 text-white mb-6">
                La precisión clínica
                <br />
                <span className="text-cyan-400">al servicio del deporte.</span>
              </h2>
              <p className="htk-body mb-8">
                En HTK Center se unen intervención clínica, optimización y
                entrenamiento integrado. Nuestro equipo multidisciplinario
                combina las tecnologías de última generación con protocolos
                científicos para maximizar el rendimiento deportivo sin dejar
                de lado el aspecto clínico del deporte y atletas.
              </p>

              {/* Features List */}
              <div className="space-y-3">
                {[
                  "Tecnología de kinesiología avanzada",
                  "Atención técnica de alto performance",
                  "Equipo clínico y científico especializado",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <CircleCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-200 text-sm sm:text-base">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Facilities Showcase */}
      <section className="w-full bg-[#0f1420] py-14 sm:py-20 border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-baseline justify-between mb-8 sm:mb-12">
            <div>
              <span className="htk-chip mb-4 inline-flex">+ Instalaciones</span>
              <h2 className="htk-h2 text-white mt-4">
                Conoce <span className="text-cyan-400">el centro</span>
              </h2>
            </div>
          </div>

          {/* Facilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="relative rounded-3xl overflow-hidden border border-white/[0.06] aspect-[4/5] md:aspect-auto md:row-span-2">
              <img
                src={facilities[0].image}
                alt={facilities[0].title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <p className="text-white font-bold text-xl">{facilities[0].title}</p>
                <p className="text-gray-300 text-xs mt-1 uppercase tracking-[0.14em]">
                  Equipamiento premium
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              {facilities.slice(1).map((facility) => (
                <div
                  key={facility.title}
                  className="relative rounded-3xl overflow-hidden border border-white/[0.06] aspect-[16/9] md:aspect-[16/7]"
                >
                  <img
                    src={facility.image}
                    alt={facility.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <p className="absolute bottom-5 left-5 text-white font-bold text-lg">
                    {facility.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

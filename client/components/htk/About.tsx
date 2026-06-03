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
    image: "https://placehold.co/600x400/1a2a3a/1a2a3a?text=Zona+de+Pesas",
  },
  {
    title: "Área Kinésica",
    image: "https://placehold.co/600x300/e8dcc8/e8dcc8?text=Área+Kinésica",
  },
  {
    title: "Cancha Exterior",
    image: "https://placehold.co/600x300/2a4a2a/2a4a2a?text=Cancha+Exterior",
  },
];

export default function About() {
  return (
    <>
      {/* Stats Section */}
      <section id="about" className="w-full bg-[#0a0e1a] py-12 sm:py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-cyan-400 mb-2">
                  {stat.value}
                </div>
                <p className="text-xs uppercase text-gray-400 font-semibold tracking-widest">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="w-full bg-[#0f1420] py-12 sm:py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
            {/* Image */}
            <div className="bg-[#1a1f2e] rounded-2xl overflow-hidden border border-[#2a2f3e]">
              <img
                src="https://placehold.co/600x400/2a3a4a/2a3a4a?text=HTK+Facility"
                alt="HTK Center Facility"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Content */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-6">
                "La precisión clínica al servicio del deporte."
              </h2>
              <p className="text-base sm:text-lg text-gray-400 leading-relaxed mb-8">
                En HTK Center se unen intervención clínica, optimización y
                entrenamiento integrado. Nuestro equipo multidisciplinario
                combina las tecnologías de última generación con protocolos
                científicos para maximizar el rendimiento deportivo sin dejar
                de lado el aspecto clínico del deporte y atletas.
              </p>

              {/* Features List */}
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CircleCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200 text-sm">
                    Tecnología de kinesiología avanzada
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CircleCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200 text-sm">
                    Atención técnica de alto performance
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <CircleCheck className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-200 text-sm">
                    Equipo clínico y científico de Modalidad
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Facilities Showcase */}
      <section className="w-full bg-[#0f1420] py-12 sm:py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-xs uppercase font-semibold text-cyan-400 tracking-widest mb-4">
              Instalaciones
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold">
              CONOCE EL <span className="text-cyan-400">CENTRO</span>
            </h2>
          </div>

          {/* Facilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Large Image */}
            <div className="relative bg-[#1a1f2e] rounded-2xl overflow-hidden border border-[#2a2f3e] h-96 md:h-full md:row-span-2">
              <img
                src={facilities[0].image}
                alt={facilities[0].title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-6 left-6 bg-black bg-opacity-80 backdrop-blur-sm px-4 py-3 rounded-lg">
                <p className="text-white font-bold text-lg">
                  {facilities[0].title}
                </p>
              </div>
            </div>

            {/* Two Smaller Images */}
            <div className="space-y-6">
              {facilities.slice(1).map((facility) => (
                <div
                  key={facility.title}
                  className="relative bg-[#1a1f2e] rounded-2xl overflow-hidden border border-[#2a2f3e] h-40"
                >
                  <img
                    src={facility.image}
                    alt={facility.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 backdrop-blur-sm px-3 py-2 rounded-lg">
                    <p className="text-white font-bold text-base">
                      {facility.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

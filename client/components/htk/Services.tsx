import {
  Heartbeat,
  Activity,
  Brain,
  Apple,
  Dumbbell,
} from "lucide-react";

const services = [
  {
    title: "Evaluación Biomecánica",
    description:
      "Análisis preciso del movimiento para prevenir lesiones y optimizar el rendimiento deportivo.",
    icon: Heartbeat,
  },
  {
    title: "Preparación Física",
    description:
      "Programas personalizados basados en evidencia científica con un enfoque individualizado.",
    icon: Activity,
  },
  {
    title: "Kinesiología Deportiva",
    description:
      "Recuperación funcional avanzada con tecnologías de última generación.",
    icon: Brain,
  },
];

const specialties = [
  {
    title: "Kinesiología",
    description:
      "Evaluación biomecánica, prevención de lesiones y recuperación funcional para optimizar el rendimiento.",
    icon: Brain,
  },
  {
    title: "Nutrición",
    description:
      "Planes nutricionales personalizados para optimizar el rendimiento, la recuperación y la salud metabólica.",
    icon: Apple,
  },
  {
    title: "Entrenamiento",
    description:
      "Programas de entrenamiento de alta intensidad diseñados para atletas y equipos de alto rendimiento.",
    icon: Dumbbell,
  },
  {
    title: "Prep. Física",
    description:
      "Preparación física específica para cada deporte con metodologías científicas y tecnología avanzada.",
    icon: Activity,
  },
];

export default function Services() {
  return (
    <>
      {/* Core Services */}
      <section className="w-full bg-[#0f1420] py-20 sm:py-32">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              <span className="text-white">Preparación física de alto</span>
              <br />
              <span className="text-white">rendimiento y</span>
              <br />
              <span className="text-cyan-400">kinesiología integral</span>
            </h2>
            <p className="text-base sm:text-lg text-gray-400 max-w-3xl mx-auto mt-4">
              Combinamos ciencia médica, tecnología deportiva y nutrición
              personalizada para deportistas, clubes y equipos que buscan
              maximizar su rendimiento atlético.
            </p>
          </div>

          {/* Service Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  className="bg-[#1a1f2e] rounded-xl p-8 border border-[#2a2f3e]"
                >
                  <div className="w-14 h-14 bg-cyan-400 bg-opacity-10 rounded-xl flex items-center justify-center mb-5">
                    <Icon className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{service.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {service.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section className="w-full bg-[#0a0e1a] py-20 sm:py-32">
        <div className="max-w-6xl mx-auto px-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {specialties.map((specialty) => {
              const Icon = specialty.icon;
              return (
                <div
                  key={specialty.title}
                  className="text-center"
                >
                  <div className="w-16 h-16 bg-cyan-400 bg-opacity-10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{specialty.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {specialty.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

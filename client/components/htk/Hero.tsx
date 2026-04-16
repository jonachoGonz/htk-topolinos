import { Star, Users, Dumbbell, Trophy, Clock } from "lucide-react";

export default function Hero() {
  return (
    <section className="w-full bg-gradient-to-b from-[#0a0e1a] to-[#0f1420] py-20 sm:py-32">
      <div className="max-w-6xl mx-auto px-5">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1f2e] rounded-full mb-6">
            <Star className="w-4 h-4 text-cyan-400" fill="currentColor" />
            <span className="text-xs uppercase font-semibold text-cyan-400 tracking-wider">
              Excelencia en Deporte
            </span>
          </div>
        </div>

        {/* Main Heading */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
            <span className="text-white">HTK Center:</span>
            <br />
            <span className="text-cyan-400">Entrenamiento</span>
            <br />
            <span className="text-white">y Salud de Alto Rendimiento</span>
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Optimiza tu rendimiento físico con kinesiología especializada y
            entrenamiento de élite en el centro más avanzado de la región.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="w-full sm:w-auto px-6 py-3.5 bg-cyan-400 text-[#0a0e1a] font-bold rounded hover:bg-cyan-500 transition">
              Agendar Clase de Prueba
            </button>
            <button className="w-full sm:w-auto px-6 py-3.5 bg-transparent text-white border border-[#2a2f3e] rounded hover:bg-[#1a1f2e] transition">
              Ver Instalaciones
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="text-xs uppercase text-gray-400 font-semibold">
                Entrenadores Pro
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Dumbbell className="w-6 h-6 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="text-xs uppercase text-gray-400 font-semibold">
                Equipamiento Pro
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="text-xs uppercase text-gray-400 font-semibold">
                Alto Nivel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="text-xs uppercase text-gray-400 font-semibold">
                24/7 Acceso
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

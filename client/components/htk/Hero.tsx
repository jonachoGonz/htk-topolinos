import { Star, Users, Dumbbell, Trophy, Clock, ChevronDown } from "lucide-react";

const stats = [
  { icon: Users, value: "500+", label: "Atletas entrenados" },
  { icon: Dumbbell, value: "15+", label: "Deportes cubiertos" },
  { icon: Trophy, value: "98%", label: "Tasa de recuperación" },
  { icon: Clock, value: "24/7", label: "Atención continua" },
];

export default function Hero() {
  return (
    <section className="w-full relative overflow-hidden bg-gradient-to-b from-[#0a0e1a] via-[#0c1020] to-[#0f1420] py-16 sm:py-24 lg:py-36">
      {/* Glow background effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-400/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-cyan-600/4 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 rounded-full">
            <Star className="w-3.5 h-3.5 text-cyan-400" fill="currentColor" />
            <span className="text-xs uppercase font-semibold text-cyan-400 tracking-wider">
              Centro de Alto Rendimiento
            </span>
          </div>
        </div>

        {/* Main Heading */}
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-5 sm:mb-6">
            <span className="text-white">Rendimiento </span>
            <span className="text-cyan-400">físico</span>
            <span className="text-white"> de</span>
            <br />
            <span className="text-white">élite con </span>
            <span className="text-cyan-400">ciencia clínica</span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-gray-400 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2">
            Kinesiología especializada, nutrición y entrenamiento integrado para
            deportistas y equipos que buscan maximizar su potencial.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 bg-cyan-400 text-[#0a0e1a] font-bold rounded-xl hover:bg-cyan-300 active:scale-95 transition-all text-sm sm:text-base text-center shadow-lg shadow-cyan-400/20"
            >
              Agendar Clase de Prueba
            </a>
            <a
              href="#servicios"
              className="w-full sm:w-auto px-7 py-3.5 bg-white/5 text-white border border-white/10 rounded-xl hover:bg-white/10 transition text-sm sm:text-base text-center"
            >
              Conocer los Servicios
            </a>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 border-t border-white/[0.06] pt-10 sm:pt-12 mt-6">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`flex flex-col items-center text-center px-4 py-2 ${
                  i < 3 ? "sm:border-r sm:border-white/[0.06]" : ""
                }`}
              >
                <Icon className="w-5 h-5 text-cyan-400 mb-2" />
                <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide font-medium">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Scroll hint */}
        <div className="flex justify-center mt-10 sm:mt-14 animate-bounce">
          <ChevronDown className="w-5 h-5 text-gray-600" />
        </div>
      </div>
    </section>
  );
}

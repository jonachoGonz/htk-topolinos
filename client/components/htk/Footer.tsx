import {
  Instagram,
  Facebook,
  Twitter,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-[#0f1420] border-t border-[#1a1f2e] py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-5">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Logo & Description */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <svg
                className="w-7 h-7"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#00d4ff" />
                <path
                  d="M2 17L12 22L22 17"
                  stroke="#00d4ff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2 12L12 17L22 12"
                  stroke="#00d4ff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-base font-bold text-white">
                HTK<span className="text-cyan-400">CENTER</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              El centro más avanzado de entrenamiento de alto rendimiento y
              kinesiología deportiva de la región.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-9 h-9 bg-[#1a1f2e] rounded-lg flex items-center justify-center hover:bg-[#2a2f3e] transition"
              >
                <Instagram className="w-4 h-4 text-cyan-400" />
              </a>
              <a
                href="#"
                className="w-9 h-9 bg-[#1a1f2e] rounded-lg flex items-center justify-center hover:bg-[#2a2f3e] transition"
              >
                <Facebook className="w-4 h-4 text-cyan-400" />
              </a>
              <a
                href="#"
                className="w-9 h-9 bg-[#1a1f2e] rounded-lg flex items-center justify-center hover:bg-[#2a2f3e] transition"
              >
                <Twitter className="w-4 h-4 text-cyan-400" />
              </a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-base font-bold text-white mb-4">Contacto</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-400">+54 9 1234 5678</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-400">
                  info@htkcenter.com
                </span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-400">
                  <p>Av. Presidente 1234</p>
                  <p>Ciudad, Provincia</p>
                </div>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-base font-bold text-white mb-4">Links</h4>
            <div className="space-y-2">
              <a
                href="#"
                className="block text-sm text-gray-400 hover:text-cyan-400 transition"
              >
                Qué Hacemos
              </a>
              <a
                href="#"
                className="block text-sm text-gray-400 hover:text-cyan-400 transition"
              >
                Kinesiología
              </a>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-base font-bold text-white mb-4">Horarios</h4>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-400">Lunes - Viernes</p>
                <p className="text-sm text-white font-semibold">
                  07:00 - 22:00
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mt-3">Sábado - Domingo</p>
                <p className="text-sm text-white font-semibold">
                  08:00 - 20:00
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#1a1f2e] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            © 2024 HTK Center. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-sm text-gray-400 hover:text-cyan-400 transition"
            >
              Términos de Servicio
            </a>
            <a
              href="#"
              className="text-sm text-gray-400 hover:text-cyan-400 transition"
            >
              Privacidad
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

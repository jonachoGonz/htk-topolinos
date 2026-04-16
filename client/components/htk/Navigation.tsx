import { Menu } from "lucide-react";
import { useState } from "react";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="w-full bg-[#0a0e1a] border-b border-[#1a1f2e]">
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <svg
            className="w-8 h-8"
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
          <span className="text-xl font-bold text-white">
            HTK<span className="text-cyan-400">CENTER</span>
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          <button className="text-sm text-gray-400 hover:text-white transition">
            Qué Hacemos
          </button>
          <button className="text-sm text-gray-400 hover:text-white transition">
            Conocé el Centro
          </button>
          <button className="text-sm text-gray-400 hover:text-white transition">
            Planes
          </button>
          <button className="text-sm text-gray-400 hover:text-white transition">
            Contacto
          </button>
        </div>

        {/* Action Button & Mobile Menu */}
        <div className="flex items-center gap-4">
          <button className="hidden sm:block px-5 py-2.5 bg-cyan-400 text-[#0a0e1a] text-sm font-semibold rounded hover:bg-cyan-500 transition">
            Reservar Clase
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden"
          >
            <Menu className="w-6 h-6 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0f1420] border-t border-[#1a1f2e] p-4 space-y-3">
          <button className="block w-full text-left text-sm text-gray-400 hover:text-white py-2">
            Qué Hacemos
          </button>
          <button className="block w-full text-left text-sm text-gray-400 hover:text-white py-2">
            Conocé el Centro
          </button>
          <button className="block w-full text-left text-sm text-gray-400 hover:text-white py-2">
            Planes
          </button>
          <button className="block w-full text-left text-sm text-gray-400 hover:text-white py-2">
            Contacto
          </button>
          <button className="w-full px-5 py-2 bg-cyan-400 text-[#0a0e1a] text-sm font-semibold rounded hover:bg-cyan-500 transition">
            Reservar Clase
          </button>
        </div>
      )}
    </nav>
  );
}

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const goLogin = () => { setMobileMenuOpen(false); navigate("/login"); };
  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="w-full bg-[#0a0e1a]/95 backdrop-blur-md border-b border-[#1a1f2e] sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 flex-shrink-0">
          <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#00d4ff" />
            <path d="M2 17L12 22L22 17" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-lg sm:text-xl font-bold text-white">
            HTK<span className="text-cyan-400">CENTER</span>
          </span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          <button onClick={() => scrollTo("servicios")} className="text-sm text-gray-400 hover:text-white transition">
            Qué Hacemos
          </button>
          <button onClick={() => scrollTo("about")} className="text-sm text-gray-400 hover:text-white transition">
            Conocé el Centro
          </button>
          <button onClick={() => scrollTo("planes")} className="text-sm text-gray-400 hover:text-white transition">
            Planes
          </button>
        </div>

        {/* Action Button & Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={goLogin}
            className="hidden sm:block px-4 sm:px-5 py-2 sm:py-2.5 bg-cyan-400 text-[#0a0e1a] text-xs sm:text-sm font-semibold rounded hover:bg-cyan-500 transition"
          >
            Mi Cuenta
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 -mr-2"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-cyan-400" /> : <Menu className="w-6 h-6 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0f1420] border-t border-[#1a1f2e] p-4 space-y-1">
          <button onClick={() => scrollTo("servicios")}
            className="block w-full text-left text-sm text-gray-300 hover:text-white py-3 px-2 rounded hover:bg-white/[0.04] transition">
            Qué Hacemos
          </button>
          <button onClick={() => scrollTo("about")}
            className="block w-full text-left text-sm text-gray-300 hover:text-white py-3 px-2 rounded hover:bg-white/[0.04] transition">
            Conocé el Centro
          </button>
          <button onClick={() => scrollTo("planes")}
            className="block w-full text-left text-sm text-gray-300 hover:text-white py-3 px-2 rounded hover:bg-white/[0.04] transition">
            Planes
          </button>
          <button onClick={goLogin}
            className="w-full mt-3 px-5 py-3 bg-cyan-400 text-[#0a0e1a] text-sm font-semibold rounded-lg hover:bg-cyan-500 transition">
            Mi Cuenta / Reservar
          </button>
        </div>
      )}
    </nav>
  );
}

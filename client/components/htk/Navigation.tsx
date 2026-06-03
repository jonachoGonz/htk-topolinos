import { Menu, X, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const sections = [
  { id: "home", label: "Inicio" },
  { id: "servicios", label: "Qué hacemos" },
  { id: "about", label: "Conocé el centro" },
  { id: "planes", label: "Planes" },
];

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("home");
  const navigate = useNavigate();

  const goLogin = () => {
    setMobileMenuOpen(false);
    navigate("/login");
  };
  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Scroll-spy (IntersectionObserver)
  useEffect(() => {
    const observed = sections
      .map((s) => document.getElementById(s.id))
      .filter((n): n is HTMLElement => n !== null);
    if (observed.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    observed.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  return (
    <nav className="w-full bg-[#0a0e1a]/85 backdrop-blur-md border-b border-white/[0.06] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 flex-shrink-0">
          <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#00d4ff" />
            <path d="M2 17L12 22L22 17" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="htk-display text-xl sm:text-2xl tracking-wide">
            HTK<span className="text-cyan-400">CENTER</span>
          </span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
          {sections.map((s) => {
            const active = activeId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`
                  relative px-3.5 py-2 text-sm font-medium transition rounded-full
                  ${active ? "text-white" : "text-gray-400 hover:text-white"}
                `}
              >
                {s.label}
                {active && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <a
            href="https://wa.me/56994748507?text=Hola%20HTK%20Center"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25 transition"
            aria-label="WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
          <button
            onClick={goLogin}
            className="hidden sm:inline-flex items-center px-4 py-2 bg-cyan-400 text-[#0a0e1a] text-xs font-bold rounded-full hover:bg-cyan-300 transition"
          >
            Mi cuenta
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 -mr-1"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-cyan-400" />
            ) : (
              <Menu className="w-6 h-6 text-cyan-400" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0f1420] border-t border-white/[0.06] p-4 space-y-1">
          {sections.map((s) => {
            const active = activeId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`
                  block w-full text-left text-sm py-3 px-3 rounded-lg transition
                  ${active
                    ? "text-cyan-400 bg-cyan-400/[0.06]"
                    : "text-gray-300 hover:text-white hover:bg-white/[0.04]"}
                `}
              >
                {s.label}
              </button>
            );
          })}
          <div className="grid grid-cols-2 gap-2 pt-3">
            <a
              href="https://wa.me/56994748507"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold rounded-lg hover:bg-emerald-500/25"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <button
              onClick={goLogin}
              className="px-4 py-3 bg-cyan-400 text-[#0a0e1a] text-sm font-bold rounded-lg hover:bg-cyan-300"
            >
              Mi cuenta
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

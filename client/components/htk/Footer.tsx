import { useEffect, useState } from "react";
import {
  Instagram, Facebook, Phone, Mail, MapPin, MessageCircle,
} from "lucide-react";
import { getAppSettings, type AppSettings } from "@/services/supabase";

// TikTok icon (lucide has it as 'Music2'; we use SVG for brand accuracy)
const TikTokIcon = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={p.className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V7.65a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.08z"/>
  </svg>
);

function waLink(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

const FALLBACK = {
  center_name: "HTK Center",
  center_phone: "+56994748507",
  center_email: "htkcenter@gmail.com",
  center_address: "José Domingo Cañas #1563",
  whatsapp_phone: "+56994748507",
  instagram_url: "https://www.instagram.com/htk_center",
  tiktok_handle: "HTK.center",
} as AppSettings;

export default function Footer() {
  const [s, setS] = useState<AppSettings>(FALLBACK);
  useEffect(() => {
    getAppSettings().then((r) => { if (r.success && r.data) setS({ ...FALLBACK, ...r.data }); });
  }, []);

  const wa = waLink(s.whatsapp_phone || s.center_phone);

  return (
    <footer className="w-full bg-[#0f1420] border-t border-[#1a1f2e] pt-10 sm:pt-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Logo & Description */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-4">
              <img
                src="/brand/logo.svg"
                alt={s.center_name || "HTK Center"}
                className="h-7 w-auto"
              />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              {s.tagline || "Centro de entrenamiento de alto rendimiento y kinesiología deportiva."}
            </p>
            <div className="flex items-center gap-2">
              {s.instagram_url && (
                <a href={s.instagram_url} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-[#1a1f2e] rounded-lg flex items-center justify-center hover:bg-[#2a2f3e] transition"
                  aria-label="Instagram">
                  <Instagram className="w-4 h-4 text-cyan-400" />
                </a>
              )}
              {s.tiktok_handle && (
                <a href={`https://tiktok.com/@${s.tiktok_handle.replace("@","")}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-[#1a1f2e] rounded-lg flex items-center justify-center hover:bg-[#2a2f3e] transition"
                  aria-label="TikTok">
                  <TikTokIcon className="w-4 h-4 text-cyan-400" />
                </a>
              )}
              {s.facebook_url && (
                <a href={s.facebook_url} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-[#1a1f2e] rounded-lg flex items-center justify-center hover:bg-[#2a2f3e] transition"
                  aria-label="Facebook">
                  <Facebook className="w-4 h-4 text-cyan-400" />
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center hover:bg-emerald-500/20 transition"
                  aria-label="WhatsApp">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                </a>
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-base font-bold text-white mb-3">Contacto</h4>
            <div className="space-y-3">
              {s.center_phone && (
                <a href={`tel:${s.center_phone.replace(/\s/g,"")}`} className="flex items-start gap-3 hover:text-cyan-400 transition">
                  <Phone className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-400 hover:text-cyan-400">{s.center_phone}</span>
                </a>
              )}
              {s.center_email && (
                <a href={`mailto:${s.center_email}`} className="flex items-start gap-3 hover:text-cyan-400 transition break-all">
                  <Mail className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-400 hover:text-cyan-400">{s.center_email}</span>
                </a>
              )}
              {s.center_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-400">{s.center_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-base font-bold text-white mb-3">Links</h4>
            <div className="space-y-2">
              <a href="#servicios" className="block text-sm text-gray-400 hover:text-cyan-400 transition">Servicios</a>
              <a href="#planes" className="block text-sm text-gray-400 hover:text-cyan-400 transition">Planes</a>
              <a href="/login" className="block text-sm text-gray-400 hover:text-cyan-400 transition">Mi cuenta</a>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-base font-bold text-white mb-3">Horarios</h4>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-400">Lunes - Viernes</p>
                <p className="text-sm text-white font-semibold">07:00 - 22:00</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mt-2">Sábado - Domingo</p>
                <p className="text-sm text-white font-semibold">08:00 - 20:00</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#1a1f2e] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-gray-400 text-center sm:text-left">
            © {new Date().getFullYear()} {s.center_name || "HTK Center"}. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="#" className="text-xs sm:text-sm text-gray-400 hover:text-cyan-400 transition">Términos</a>
            <a href="#" className="text-xs sm:text-sm text-gray-400 hover:text-cyan-400 transition">Privacidad</a>
          </div>
        </div>
      </div>

      {/* Giant wordmark */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none mt-8 sm:mt-14 -mb-4 sm:-mb-6 px-4"
      >
        <div className="htk-display text-white/[0.05] text-center leading-[0.85] text-[22vw] tracking-[-0.04em]">
          HTKCENTER
        </div>
      </div>
    </footer>
  );
}

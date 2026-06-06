import { Phone, Mail, MapPin, Instagram } from "lucide-react";

// TikTok no está en lucide; usamos un SVG inline minimal.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.93a8.16 8.16 0 0 0 4.77 1.52V7.07a4.85 4.85 0 0 1-1.84-.38z" />
    </svg>
  );
}

export default function LoginFooter() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="w-full bg-black border-t border-white/5 font-lexend">
      <div className="max-w-6xl mx-auto px-5 py-16">
        {/* Main Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-8">
          {/* Brand (col span 2) */}
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              {/* Rocket icon from figma */}
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 9.99446L6.9375 11.0257C7.22917 10.4424 7.53125 9.87987 7.84375 9.33821C8.15625 8.79654 8.5 8.25487 8.875 7.71321L7.125 7.36946L4.5 9.99446ZM8.9375 12.5882L12.5 16.1195C13.375 15.7861 14.3125 15.2757 15.3125 14.5882C16.3125 13.9007 17.25 13.1195 18.125 12.2445C19.5833 10.7861 20.724 9.16633 21.5469 7.38508C22.3698 5.60383 22.7292 3.96321 22.625 2.46321C21.125 2.35904 19.4792 2.71841 17.6875 3.54133C15.8958 4.36425 14.2708 5.50487 12.8125 6.96321C11.9375 7.83821 11.1562 8.77571 10.4688 9.77571C9.78125 10.7757 9.27083 11.7132 8.9375 12.5882ZM14.5 10.557C14.0208 10.0778 13.7812 9.48925 13.7812 8.79133C13.7812 8.09341 14.0208 7.50487 14.5 7.02571C14.9792 6.54654 15.5729 6.30696 16.2812 6.30696C16.9896 6.30696 17.5833 6.54654 18.0625 7.02571C18.5417 7.50487 18.7812 8.09341 18.7812 8.79133C18.7812 9.48925 18.5417 10.0778 18.0625 10.557C17.5833 11.0361 16.9896 11.2757 16.2812 11.2757C15.5729 11.2757 14.9792 11.0361 14.5 10.557ZM15.0938 20.5882L17.7188 17.9632L17.375 16.2132C16.8333 16.5882 16.2917 16.9267 15.75 17.2288C15.2083 17.5309 14.6458 17.8278 14.0625 18.1195L15.0938 20.5882ZM24.875 0.181956C25.2708 2.70279 25.026 5.15591 24.1406 7.54133C23.2552 9.92675 21.7292 12.2028 19.5625 14.3695L20.1875 17.4632C20.2708 17.8799 20.25 18.2861 20.125 18.682C20 19.0778 19.7917 19.4215 19.5 19.7132L14.25 24.9632L11.625 18.807L6.28125 13.4632L0.125 10.8382L5.34375 5.58821C5.63542 5.29654 5.98438 5.08821 6.39062 4.96321C6.79688 4.83821 7.20833 4.81737 7.625 4.90071L10.7188 5.52571C12.8854 3.35904 15.1562 1.82779 17.5312 0.931956C19.9062 0.0361223 22.3542 -0.213878 24.875 0.181956ZM2.34375 17.432C3.07292 16.7028 3.96354 16.333 5.01562 16.3226C6.06771 16.3122 6.95833 16.6715 7.6875 17.4007C8.41667 18.1299 8.77604 19.0205 8.76562 20.0726C8.75521 21.1247 8.38542 22.0153 7.65625 22.7445C7.13542 23.2653 6.26562 23.7132 5.04688 24.0882C3.82812 24.4632 2.14583 24.7965 0 25.0882C0.291667 22.9424 0.625 21.2601 1 20.0413C1.375 18.8226 1.82292 17.9528 2.34375 17.432ZM4.125 19.182C3.91667 19.3903 3.70833 19.7705 3.5 20.3226C3.29167 20.8747 3.14583 21.432 3.0625 21.9945C3.625 21.9111 4.18229 21.7705 4.73438 21.5726C5.28646 21.3747 5.66667 21.1715 5.875 20.9632C6.125 20.7132 6.26042 20.4111 6.28125 20.057C6.30208 19.7028 6.1875 19.4007 5.9375 19.1507C5.6875 18.9007 5.38542 18.7809 5.03125 18.7913C4.67708 18.8017 4.375 18.932 4.125 19.182Z" fill="#139FED"/>
              </svg>
              <span className="text-2xl font-black tracking-tight uppercase">
                <span className="text-white">HTK </span>
                <span className="text-[#139fed]">CENTER</span>
              </span>
            </div>
            <p className="text-white/50 text-base leading-6 max-w-sm mb-6">
              Evoluciona tu rendimiento con tecnología de punta y acompañamiento
              profesional especializado.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/htk_center"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram HTK Center"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              >
                <Instagram className="w-[18px] h-[18px] text-white" />
              </a>
              <a
                href="https://tiktok.com/@HTK.center"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok HTK Center"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              >
                <TikTokIcon className="w-[18px] h-[18px] text-white" />
              </a>
            </div>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-[#139fed] text-sm font-normal tracking-[1.4px] uppercase mb-6">
              CONTACTO
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Phone className="w-[18px] h-[18px] text-[#139fed] flex-shrink-0" />
                <a href="https://wa.me/56994748507" target="_blank" rel="noopener noreferrer"
                   className="text-white/60 text-sm hover:text-white transition">
                  +56 9 9474 8507
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-[18px] h-[18px] text-[#139fed] flex-shrink-0" />
                <span className="text-white/60 text-sm">hola@htkcenter.cl</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-[18px] h-[18px] text-[#139fed] flex-shrink-0 mt-0.5" />
                <a
                  href="https://maps.google.com/?q=José+Domingo+Cañas+1563+Santiago+Chile"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 text-sm leading-5 hover:text-white transition"
                >
                  José Domingo Cañas #1563,
                  <br />
                  Santiago, Chile
                </a>
              </div>
            </div>
          </div>

          {/* Horario */}
          <div>
            <h4 className="text-[#139fed] text-sm font-normal tracking-[1.4px] uppercase mb-6">
              HORARIO
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-white/60 text-sm">Lun - Vie:</span>
                <span className="text-white text-sm">07:00 - 22:00</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-white/60 text-sm">Sábados:</span>
                <span className="text-white text-sm">09:00 - 18:00</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-white/60 text-sm">Domingos:</span>
                <span className="text-white text-sm">Cerrado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-[10px] font-medium tracking-[1px] uppercase">
            © {currentYear} HTK CENTER · TODOS LOS DERECHOS RESERVADOS
          </p>
          {/* Términos y Privacidad ocultos hasta que existan las páginas.
              Cuando estén listas, des-comenta y apunta a /terminos /privacidad. */}
        </div>
      </div>
    </footer>
  );
}

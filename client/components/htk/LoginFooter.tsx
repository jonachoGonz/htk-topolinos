import { Phone, Mail, MapPin } from "lucide-react";

export default function LoginFooter() {
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
                href="#"
                aria-label="Share"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              >
                <svg width="15" height="17" viewBox="0 0 15 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.5 16.6667C11.8056 16.6667 11.2153 16.4236 10.7292 15.9375C10.2431 15.4514 10 14.8611 10 14.1667C10 14.0833 10.0208 13.8889 10.0625 13.5833L4.20833 10.1667C3.98611 10.375 3.72917 10.5382 3.4375 10.6562C3.14583 10.7743 2.83333 10.8333 2.5 10.8333C1.80556 10.8333 1.21528 10.5903 0.729167 10.1042C0.243056 9.61806 0 9.02778 0 8.33333C0 7.63889 0.243056 7.04861 0.729167 6.5625C1.21528 6.07639 1.80556 5.83333 2.5 5.83333C2.83333 5.83333 3.14583 5.89236 3.4375 6.01042C3.72917 6.12847 3.98611 6.29167 4.20833 6.5L10.0625 3.08333C10.0347 2.98611 10.0174 2.89236 10.0104 2.80208C10.0035 2.71181 10 2.61111 10 2.5C10 1.80556 10.2431 1.21528 10.7292 0.729167C11.2153 0.243056 11.8056 0 12.5 0C13.1944 0 13.7847 0.243056 14.2708 0.729167C14.7569 1.21528 15 1.80556 15 2.5C15 3.19444 14.7569 3.78472 14.2708 4.27083C13.7847 4.75694 13.1944 5 12.5 5C12.1667 5 11.8542 4.94097 11.5625 4.82292C11.2708 4.70486 11.0139 4.54167 10.7917 4.33333L4.9375 7.75C4.96528 7.84722 4.98264 7.94097 4.98958 8.03125C4.99653 8.12153 5 8.22222 5 8.33333C5 8.44444 4.99653 8.54514 4.98958 8.63542C4.98264 8.72569 4.96528 8.81944 4.9375 8.91667L10.7917 12.3333C11.0139 12.125 11.2708 11.9618 11.5625 11.8438C11.8542 11.7257 12.1667 11.6667 12.5 11.6667C13.1944 11.6667 13.7847 11.9097 14.2708 12.3958C14.7569 12.8819 15 13.4722 15 14.1667C15 14.8611 14.7569 15.4514 14.2708 15.9375C13.7847 16.4236 13.1944 16.6667 12.5 16.6667Z" fill="white"/>
                </svg>
              </a>
              <a
                href="#"
                aria-label="Chrome"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              >
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.33333 8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333V8.33333M8.33333 16.6667C7.19444 16.6667 6.11806 16.4479 5.10417 16.0104C4.09028 15.5729 3.20486 14.9757 2.44792 14.2188C1.69097 13.4618 1.09375 12.5764 0.65625 11.5625C0.21875 10.5486 0 9.47222 0 8.33333C0 7.18056 0.21875 6.10069 0.65625 5.09375C1.09375 4.08681 1.69097 3.20486 2.44792 2.44792C3.20486 1.69097 4.09028 1.09375 5.10417 0.65625C6.11806 0.21875 7.19444 0 8.33333 0C9.48611 0 10.566 0.21875 11.5729 0.65625C12.5799 1.09375 13.4618 1.69097 14.2188 2.44792C14.9757 3.20486 15.5729 4.08681 16.0104 5.09375C16.4479 6.10069 16.6667 7.18056 16.6667 8.33333C16.6667 9.47222 16.4479 10.5486 16.0104 11.5625C15.5729 12.5764 14.9757 13.4618 14.2188 14.2188C13.4618 14.9757 12.5799 15.5729 11.5729 16.0104C10.566 16.4479 9.48611 16.6667 8.33333 16.6667Z" fill="white"/>
                </svg>
              </a>
              <a
                href="#"
                aria-label="Clipboard"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              >
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.91667 10.4167L13.75 6.66667L7.91667 2.91667V10.4167ZM5 13.3333C4.54167 13.3333 4.14931 13.1701 3.82292 12.8438C3.49653 12.5174 3.33333 12.125 3.33333 11.6667V1.66667C3.33333 1.20833 3.49653 0.815972 3.82292 0.489583C4.14931 0.163194 4.54167 0 5 0H15C15.4583 0 15.8507 0.163194 16.1771 0.489583C16.5035 0.815972 16.6667 1.20833 16.6667 1.66667V11.6667C16.6667 12.125 16.5035 12.5174 16.1771 12.8438C15.8507 13.1701 15.4583 13.3333 15 13.3333H5ZM5 11.6667H15V1.66667H5V11.6667ZM1.66667 16.6667C1.20833 16.6667 0.815972 16.5035 0.489583 16.1771C0.163194 15.8507 0 15.4583 0 15V3.33333H1.66667V15H13.3333V16.6667H1.66667Z" fill="white"/>
                </svg>
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
                <span className="text-white/60 text-sm">+56 9 1234 5678</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-[18px] h-[18px] text-[#139fed] flex-shrink-0" />
                <span className="text-white/60 text-sm">hola@htkcenter.cl</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-[18px] h-[18px] text-[#139fed] flex-shrink-0 mt-0.5" />
                <span className="text-white/60 text-sm leading-5">
                  Av. Providencia 1234,
                  <br />
                  Santiago, Chile
                </span>
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
            © 2024 HTK CENTER - ALL RIGHTS RESERVED
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-white/30 text-[10px] font-medium tracking-[1px] uppercase hover:text-white/60 transition">
              TÉRMINOS Y CONDICIONES
            </a>
            <a href="#" className="text-white/30 text-[10px] font-medium tracking-[1px] uppercase hover:text-white/60 transition">
              PRIVACIDAD
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, KeyRound, ArrowRight, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { loginTeacher, loginStudent } from "@/services/supabase";
import Navigation from "@/components/htk/Navigation";
import LoginFooter from "@/components/htk/LoginFooter";

// ─── Input with left icon ────────────────────────────────────────────
interface InputFieldProps {
  icon: React.ReactNode;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

function InputField({ icon, placeholder, type = "text", value, onChange, disabled }: InputFieldProps) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]">
        {icon}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-[#18181b]/50 border border-[#27272a] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-[#52525b] font-lexend focus:outline-none focus:border-[#3f3f46] focus:bg-[#18181b]/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

// ─── Teacher Login Card ───────────────────────────────────────────────
function TeacherCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await loginTeacher(email, password);
      if (result.success) {
        toast.success("¡Bienvenido, Profesor!");
        navigate("/dashboard/teacher");
      } else {
        setError(result.error ?? "Error al iniciar sesión.");
      }
    } catch {
      setError("Error inesperado. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center bg-[#18181b]/60 backdrop-blur-md border border-white/10 rounded-2xl p-8">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-[#27272a] flex items-center justify-center mb-6">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 19.5C19.75 19.5 18.6875 19.0625 17.8125 18.1875C16.9375 17.3125 16.5 16.25 16.5 15C16.5 13.75 16.9375 12.6875 17.8125 11.8125C18.6875 10.9375 19.75 10.5 21 10.5C22.25 10.5 23.3125 10.9375 24.1875 11.8125C25.0625 12.6875 25.5 13.75 25.5 15C25.5 16.25 25.0625 17.3125 24.1875 18.1875C23.3125 19.0625 22.25 19.5 21 19.5ZM21 16.5C21.425 16.5 21.7813 16.3563 22.0688 16.0688C22.3563 15.7813 22.5 15.425 22.5 15C22.5 14.575 22.3563 14.2187 22.0688 13.9312C21.7813 13.6437 21.425 13.5 21 13.5C20.575 13.5 20.2187 13.6437 19.9312 13.9312C19.6437 14.2187 19.5 14.575 19.5 15C19.5 15.425 19.6437 15.7813 19.9312 16.0688C20.2187 16.3563 20.575 16.5 21 16.5ZM12 30V25.65C12 25.125 12.125 24.6313 12.375 24.1688C12.625 23.7063 12.975 23.3375 13.425 23.0625C14.225 22.5875 15.0688 22.1938 15.9563 21.8813C16.8438 21.5688 17.75 21.3375 18.675 21.1875L21 24L23.325 21.1875C24.25 21.3375 25.15 21.5688 26.025 21.8813C26.9 22.1938 27.7375 22.5875 28.5375 23.0625C28.9875 23.3375 29.3438 23.7063 29.6063 24.1688C29.8688 24.6313 30 25.125 30 25.65V30H12ZM3 27C2.175 27 1.46875 26.7062 0.88125 26.1187C0.29375 25.5312 0 24.825 0 24V3C0 2.175 0.29375 1.46875 0.88125 0.88125C1.46875 0.29375 2.175 0 3 0H24C24.825 0 25.5312 0.29375 26.1187 0.88125C26.7062 1.46875 27 2.175 27 3V10.5C26.6 10 26.1625 9.525 25.6875 9.075C25.2125 8.625 24.65 8.325 24 8.175V3H3V24H9.225C9.15 24.275 9.09375 24.55 9.05625 24.825C9.01875 25.1 9 25.375 9 25.65V27H3ZM6 9H16.5C17.15 8.5 17.8625 8.125 18.6375 7.875C19.4125 7.625 20.2 7.5 21 7.5V6H6V9ZM6 15H13.5C13.5 14.475 13.5562 13.9625 13.6687 13.4625C13.7812 12.9625 13.9375 12.475 14.1375 12H6V15ZM6 21H11.175C11.45 20.775 11.7437 20.575 12.0562 20.4C12.3687 20.225 12.6875 20.0625 13.0125 19.9125V18H6V21Z" fill="#0EA5E9"/>
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-[#f4f4f5] mb-3 font-lexend">Profesor</h2>

      {/* Description */}
      <p className="text-[#a1a1aa] text-sm text-center leading-relaxed mb-8 font-lexend">
        Gestiona tus pacientes, sesiones de entrenamiento y planes de rehabilitación con
        herramientas avanzadas de seguimiento.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <InputField
          icon={<Mail className="w-[17px] h-[17px]" />}
          placeholder="Email profesional"
          type="email"
          value={email}
          onChange={setEmail}
          disabled={loading}
        />
        <InputField
          icon={<Lock className="w-[14px] h-[14px]" />}
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          disabled={loading}
        />

        {error && (
          <p className="text-red-400 text-xs text-center font-lexend">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-base rounded-xl py-3 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(2,132,199,0.3)] hover:shadow-[0_0_30px_rgba(2,132,199,0.5)] font-lexend"
        >
          {loading ? "Accediendo..." : "Acceso Profesional"}
          {!loading && <ArrowRight className="w-3 h-3" />}
        </button>
      </form>

      {/* Badge */}
      <div className="flex items-center gap-2 mt-6">
        <ShieldCheck className="w-[10px] h-[12px] text-[#71717a]" />
        <span className="text-[#71717a] text-xs font-lexend">Portal de Administración Central</span>
      </div>
    </div>
  );
}

// ─── Student Login Card ───────────────────────────────────────────────
function StudentCard() {
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await loginStudent(identity, password);
      if (result.success) {
        toast.success("¡Bienvenido al Portal!");
        navigate("/dashboard/student");
      } else {
        setError(result.error ?? "Error al iniciar sesión.");
      }
    } catch {
      setError("Error inesperado. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center bg-[#18181b]/60 backdrop-blur-md border border-white/10 rounded-2xl p-8">
      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-[#27272a] flex items-center justify-center mb-6">
        <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.95 29.7L14.85 27.6L20.175 22.275L7.425 9.525L2.1 14.85L0 12.75L2.1 10.575L0 8.475L3.15 5.325L1.05 3.15L3.15 1.05L5.325 3.15L8.475 0L10.575 2.1L12.75 0L14.85 2.1L9.525 7.425L22.275 20.175L27.6 14.85L29.7 16.95L27.6 19.125L29.7 21.225L26.55 24.375L28.65 26.55L26.55 28.65L24.375 26.55L21.225 29.7L19.125 27.6L16.95 29.7Z" fill="#DC8200"/>
        </svg>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-[#f4f4f5] mb-3 font-lexend">Alumno</h2>

      {/* Description */}
      <p className="text-[#a1a1aa] text-sm text-center leading-relaxed mb-8 font-lexend">
        Accede a tu plan de entrenamiento personalizado, revisa tus progresos y comunícate con tu kinesiólogo.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <InputField
          icon={<User className="w-[14px] h-[14px]" />}
          placeholder="Email o Rut Usuario"
          type="text"
          value={identity}
          onChange={setIdentity}
          disabled={loading}
        />
        <InputField
          icon={<KeyRound className="w-[14px] h-[14px]" />}
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          disabled={loading}
        />

        {error && (
          <p className="text-red-400 text-xs text-center font-lexend">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#27272a] hover:bg-[#3f3f46] border border-[#3f3f46] hover:border-[#52525b] text-white font-bold text-base rounded-xl py-3 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed font-lexend"
        >
          {loading ? "Ingresando..." : "Ingresar al Portal"}
          {!loading && <LogIn className="w-3.5 h-3.5" />}
        </button>
      </form>

      {/* Badge */}
      <div className="flex items-center gap-2 mt-6">
        <ShieldCheck className="w-[10px] h-[12px] text-[#71717a]" />
        <span className="text-[#71717a] text-xs font-lexend">Tus datos están protegidos</span>
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────
export default function Login() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white font-lexend flex flex-col">
      <Navigation />

      <main className="flex-1 relative flex flex-col">
        {/* Background layers */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/b779d3f1f5486ebc18757e65bc960170d247e40b?width=2560"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a]/70 via-[#0a0f1a]/90 to-[#0a0f1a]" />
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/7e4d1b0d0341863a39a638ec4fdfcd9abc72249f?width=2560"
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          />
          {/* Ambient glow */}
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-sky-900/10 blur-[80px] pointer-events-none" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 py-20 px-4">
          {/* Heading */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-sky-500 tracking-tight leading-tight">
              Ingreso usuarios HTK
            </h1>
            <p className="text-[#a1a1aa] text-base mt-2 font-normal">
              Plataforma integral de kinesiología y alto rendimiento
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-[896px]">
            <TeacherCard />
            <StudentCard />
          </div>

          {/* Forgot password */}
          <button className="mt-8 text-[#71717a] text-sm font-medium hover:text-white transition">
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </main>

      <LoginFooter />
    </div>
  );
}

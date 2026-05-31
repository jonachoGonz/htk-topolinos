import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, ShieldCheck, GraduationCap, User } from "lucide-react";
import { toast } from "sonner";
import { loginTeacher, loginStudent } from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/htk/Navigation";
import LoginFooter from "@/components/htk/LoginFooter";

type Role = "teacher" | "student";

export default function Login() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const [role, setRole] = useState<Role>("student");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect once auth context reflects the new session
  useEffect(() => {
    if (user && userRole === "teacher") {
      navigate("/dashboard", { replace: true });
    } else if (user && userRole === "student") {
      navigate("/dashboard/student", { replace: true });
    }
  }, [user, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result =
        role === "teacher"
          ? await loginTeacher(identity, password)
          : await loginStudent(identity, password);
      if (result.success) {
        toast.success(
          role === "teacher" ? "¡Bienvenido, Profesor!" : "¡Bienvenido al Portal!"
        );
      } else {
        setError(result.error ?? "Error al iniciar sesión.");
        setLoading(false);
      }
    } catch {
      setError("Error inesperado. Intenta nuevamente.");
      setLoading(false);
    }
  };

  const isTeacher = role === "teacher";

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white font-lexend flex flex-col">
      <Navigation />

      <main className="flex-1 relative flex flex-col">
        {/* Background */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/b779d3f1f5486ebc18757e65bc960170d247e40b?width=2560"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a]/70 via-[#0a0f1a]/90 to-[#0a0f1a]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-sky-900/10 blur-[80px] pointer-events-none" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 py-20 px-4">
          {/* Heading */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-sky-500 tracking-tight leading-tight">
              Ingreso usuarios HTK
            </h1>
            <p className="text-[#a1a1aa] text-base mt-2">
              Plataforma integral de kinesiología y alto rendimiento
            </p>
          </div>

          {/* Single login box */}
          <div className="w-full max-w-md bg-[#18181b]/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
            {/* Tab selector */}
            <div className="grid grid-cols-2 border-b border-white/10">
              <button
                type="button"
                onClick={() => { setRole("student"); setError(""); }}
                className={`py-4 flex flex-col items-center gap-1 transition-all duration-200 ${
                  !isTeacher
                    ? "bg-[#18181b]/80 text-[#DC8200] border-b-2 border-[#DC8200]"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-sm font-semibold">Alumno</span>
              </button>
              <button
                type="button"
                onClick={() => { setRole("teacher"); setError(""); }}
                className={`py-4 flex flex-col items-center gap-1 transition-all duration-200 ${
                  isTeacher
                    ? "bg-[#18181b]/80 text-sky-500 border-b-2 border-sky-500"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <GraduationCap className="w-5 h-5" />
                <span className="text-sm font-semibold">Profesor</span>
              </button>
            </div>

            {/* Form */}
            <div className="p-8">
              <p className="text-[#a1a1aa] text-sm text-center mb-6 leading-relaxed">
                {isTeacher
                  ? "Gestiona pacientes, sesiones y planes con herramientas avanzadas de seguimiento."
                  : "Accede a tu plan personalizado, revisa tus progresos y agenda tus sesiones."}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]">
                    <Mail className="w-[17px] h-[17px]" />
                  </span>
                  <input
                    type={isTeacher ? "email" : "text"}
                    placeholder={isTeacher ? "Email profesional" : "Email o RUT"}
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    disabled={loading}
                    autoComplete="username"
                    className="w-full bg-[#18181b]/50 border border-[#27272a] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] focus:bg-[#18181b]/80 transition disabled:opacity-50"
                  />
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]">
                    <Lock className="w-[14px] h-[14px]" />
                  </span>
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                    className="w-full bg-[#18181b]/50 border border-[#27272a] rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] focus:bg-[#18181b]/80 transition disabled:opacity-50"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !identity || !password}
                  className={`w-full flex items-center justify-center gap-2 font-bold text-base rounded-xl py-3.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isTeacher
                      ? "bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-[0_0_20px_rgba(2,132,199,0.3)] hover:shadow-[0_0_30px_rgba(2,132,199,0.5)]"
                      : "bg-[#DC8200] hover:bg-[#b66a00] text-white shadow-[0_0_20px_rgba(220,130,0,0.3)] hover:shadow-[0_0_30px_rgba(220,130,0,0.5)]"
                  }`}
                >
                  {loading
                    ? "Ingresando..."
                    : isTeacher
                    ? "Acceso Profesional"
                    : "Ingresar al Portal"}
                  {!loading && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </form>

              {/* Forgot password */}
              <button
                type="button"
                className="w-full mt-4 text-center text-[#71717a] text-xs hover:text-white transition"
              >
                ¿Olvidaste tu contraseña?
              </button>

              {/* Badge */}
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/[0.06]">
                <ShieldCheck className="w-3 h-3 text-[#71717a]" />
                <span className="text-[#71717a] text-[11px]">
                  {isTeacher ? "Portal de Administración Central" : "Tus datos están protegidos"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <LoginFooter />
    </div>
  );
}

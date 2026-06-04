import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, ShieldCheck, GraduationCap, User, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { loginTeacher, loginStudent, supabase } from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/htk/Navigation";
import LoginFooter from "@/components/htk/LoginFooter";

type Role = "teacher" | "student";

const HERO_BG =
  "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=1920&q=80";

export default function Login() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const [role, setRole] = useState<Role>("student");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fallback redirect for persisted sessions only — i.e. a user lands on
  // /login while already authenticated from a previous visit. Gated on
  // `!loading` so it can never race the role-mismatch check inside
  // handleSubmit: while a submit is in flight, this effect stays idle and
  // resolveAndRedirect is the only thing that may navigate.
  useEffect(() => {
    if (!user || loading) return;
    if (userRole === "teacher") navigate("/dashboard", { replace: true });
    else if (userRole === "student") navigate("/dashboard/student", { replace: true });
  }, [user, userRole, loading, navigate]);

  // Resolve the user's role from the JWT's app_metadata (populated by the
  // sync trigger on profiles). Falls back to a profiles query only if the
  // claims aren't there yet (older session before migration 017).
  // No DB query in the happy path → cannot recurse, cannot fail on RLS cache.
  async function resolveAndRedirect(expectedRole: Role) {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session?.user) {
      setError("Sesión no encontrada. Intenta nuevamente.");
      setLoading(false);
      return;
    }

    // Happy path: claims from JWT (migration 017)
    const meta = (session.user.app_metadata ?? {}) as {
      role?: Role;
      is_admin?: boolean;
    };
    let actualRole: Role | undefined = meta.role;

    // Legacy fallback for sessions issued before the JWT claims were populated
    if (!actualRole) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      actualRole = profile?.role as Role | undefined;
    }

    if (!actualRole) {
      setError("No encontramos tu perfil. Contáctanos para activar tu cuenta.");
      setLoading(false);
      return;
    }

    if (actualRole !== expectedRole) {
      // Sign out the just-created session so the persisted-session
      // useEffect cannot rebound them straight to the wrong dashboard
      // once loading flips false, and so they can re-attempt on the
      // correct tab without a stale session lingering.
      await supabase.auth.signOut();
      setError(
        actualRole === "teacher"
          ? "Esta cuenta es de profesional. Cambia al ingreso de Profesor."
          : "Esta cuenta es de alumno. Cambia al ingreso de Alumno.",
      );
      setLoading(false);
      return;
    }

    toast.success(
      expectedRole === "teacher" ? "¡Bienvenido, Profesor!" : "¡Bienvenido al Portal!",
    );
    navigate(expectedRole === "teacher" ? "/dashboard" : "/dashboard/student", {
      replace: true,
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result =
        role === "teacher"
          ? await loginTeacher(identity, password)
          : await loginStudent(identity, password);
      if (!result.success) {
        setError(result.error ?? "Error al iniciar sesión.");
        setLoading(false);
        return;
      }
      await resolveAndRedirect(role);
    } catch {
      setError("Error inesperado. Intenta nuevamente.");
      setLoading(false);
    }
  };

  const isTeacher = role === "teacher";

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-inter flex flex-col">
      <Navigation />

      <main className="flex-1 relative flex flex-col">
        {/* Editorial background photo */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={HERO_BG}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover opacity-40"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0e1a]/85 via-[#0a0e1a]/75 to-[#0a0e1a]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,14,26,0.7)_75%)]" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center flex-1 py-16 sm:py-20 px-4">
          {/* Heading */}
          <div className="text-center mb-8 sm:mb-10 max-w-2xl">
            <span className="htk-chip htk-chip-accent mb-5 inline-flex">
              <ShieldCheck className="w-3 h-3" />
              Acceso seguro
            </span>
            <h1 className="htk-display text-5xl sm:text-7xl text-white mt-5 leading-[0.9]">
              Ingreso
              <br />
              <span className="text-cyan-400">HTK Center</span>
            </h1>
            <p className="text-gray-400 text-sm sm:text-base mt-4 leading-relaxed">
              Plataforma integral de kinesiología y alto rendimiento.
            </p>
          </div>

          {/* Login card */}
          <div className="w-full max-w-md bg-[#13182a]/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,212,255,0.15)]">
            {/* Tab selector */}
            <div
              role="tablist"
              aria-label="Tipo de cuenta"
              className="grid grid-cols-2 border-b border-white/[0.06]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={!isTeacher}
                onClick={() => {
                  setRole("student");
                  setError("");
                }}
                className={`relative py-4 flex flex-col items-center gap-1.5 transition-all duration-200 ease-out
                  ${!isTeacher ? "bg-white/[0.03] text-cyan-400" : "text-gray-500 hover:text-gray-300"}
                `}
              >
                <User className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-[0.16em] font-bold">
                  Alumno
                </span>
                {!isTeacher && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan-400 rounded-full" />
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isTeacher}
                onClick={() => {
                  setRole("teacher");
                  setError("");
                }}
                className={`relative py-4 flex flex-col items-center gap-1.5 transition-all duration-200 ease-out
                  ${isTeacher ? "bg-white/[0.03] text-cyan-400" : "text-gray-500 hover:text-gray-300"}
                `}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-[0.16em] font-bold">
                  Profesional
                </span>
                {isTeacher && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-cyan-400 rounded-full" />
                )}
              </button>
            </div>

            {/* Form */}
            <div className="p-7 sm:p-8">
              <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
                {isTeacher
                  ? "Gestiona pacientes, sesiones y planes con herramientas de seguimiento."
                  : "Accede a tu plan, revisa tus progresos y agenda sesiones."}
              </p>

              <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                <label className="block">
                  <span className="sr-only">
                    {isTeacher ? "Email profesional" : "Email o RUT"}
                  </span>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type={isTeacher ? "email" : "text"}
                      placeholder={isTeacher ? "Email profesional" : "Email o RUT"}
                      value={identity}
                      onChange={(e) => setIdentity(e.target.value)}
                      disabled={loading}
                      autoComplete="username"
                      className="
                        w-full bg-white/[0.03] border border-white/[0.08] rounded-xl
                        pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-500
                        focus:outline-none focus:border-cyan-400/40 focus:bg-white/[0.05]
                        transition disabled:opacity-50
                      "
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="sr-only">Contraseña</span>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="password"
                      placeholder="Contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="current-password"
                      className="
                        w-full bg-white/[0.03] border border-white/[0.08] rounded-xl
                        pl-11 pr-4 py-3.5 text-sm text-white placeholder-gray-500
                        focus:outline-none focus:border-cyan-400/40 focus:bg-white/[0.05]
                        transition disabled:opacity-50
                      "
                    />
                  </div>
                </label>

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs"
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !identity || !password}
                  className="
                    group w-full flex items-center justify-center gap-2
                    bg-cyan-400 hover:bg-cyan-300 text-[#0a0e1a] font-bold text-sm
                    rounded-xl py-3.5
                    shadow-[0_8px_24px_-8px_rgba(0,212,255,0.6)]
                    transition-all duration-200 ease-out
                    active:scale-[0.98]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                  "
                >
                  {loading ? (
                    <>
                      <span className="w-3 h-3 border-2 border-[#0a0e1a]/30 border-t-[#0a0e1a] rounded-full animate-spin" />
                      Ingresando…
                    </>
                  ) : (
                    <>
                      {isTeacher ? "Acceso profesional" : "Ingresar al portal"}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Forgot password */}
              <button
                type="button"
                className="w-full mt-4 text-center text-gray-500 text-xs hover:text-cyan-400 transition"
              >
                ¿Olvidaste tu contraseña?
              </button>

              {/* Footer trust badge */}
              <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/[0.06]">
                <ShieldCheck className="w-3 h-3 text-gray-500" />
                <span className="text-gray-500 text-[10px] uppercase tracking-[0.14em]">
                  {isTeacher
                    ? "Portal de administración"
                    : "Tus datos están protegidos"}
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

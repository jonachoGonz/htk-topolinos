import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/htk/Navigation";
import Footer from "@/components/htk/Footer";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Tras actualizar la contraseña, esperamos a que AuthContext resuelva el
  // rol (mismo mecanismo de espera que ProtectedRoute.tsx) antes de
  // redirigir al dashboard correcto.
  useEffect(() => {
    if (!done || authLoading || !userRole) return;
    navigate(
      userRole === "teacher" ? "/dashboard/teacher" : "/dashboard/student",
      {
        replace: true,
      },
    );
  }, [done, authLoading, userRole, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    toast.success("Contraseña actualizada");
    setDone(true);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0e1a]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#00d4ff]/20 border-t-[#00d4ff] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-inter flex flex-col">
      <Navigation />

      <main className="flex-1 relative flex flex-col items-center justify-center px-4 py-16 sm:py-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="htk-chip htk-chip-accent mb-5 inline-flex">
              <ShieldCheck className="w-3 h-3" />
              Nueva contraseña
            </span>
            <h1 className="htk-display text-4xl sm:text-5xl text-white mt-5 leading-[0.9]">
              Define tu nueva
              <br />
              <span className="text-cyan-400">contraseña</span>
            </h1>
          </div>

          <div className="bg-[#13182a]/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,212,255,0.15)] p-7 sm:p-8">
            {!user ? (
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <AlertCircle className="w-10 h-10 text-rose-400" />
                <p className="text-white text-sm font-semibold">
                  Este link de recuperación no es válido o ya venció.
                </p>
                <Link
                  to="/forgot-password"
                  className="
                    mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                    bg-cyan-400 hover:bg-cyan-300 text-[#0a0e1a] font-bold text-sm
                    transition-all duration-200 ease-out active:scale-[0.98]
                  "
                >
                  Solicitar un nuevo link
                </Link>
              </div>
            ) : (
              <>
                <form
                  onSubmit={handleSubmit}
                  className="space-y-3.5"
                  noValidate
                >
                  <label className="block">
                    <span className="sr-only">Nueva contraseña</span>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="password"
                        placeholder="Nueva contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={submitting || done}
                        autoComplete="new-password"
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
                    <span className="sr-only">Confirmar contraseña</span>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="password"
                        placeholder="Confirmar contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={submitting || done}
                        autoComplete="new-password"
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
                    disabled={
                      submitting || done || !password || !confirmPassword
                    }
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
                    {submitting ? (
                      <>
                        <span className="w-3 h-3 border-2 border-[#0a0e1a]/30 border-t-[#0a0e1a] rounded-full animate-spin" />
                        Guardando…
                      </>
                    ) : done ? (
                      "Redirigiendo…"
                    ) : (
                      <>
                        Actualizar contraseña
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>

                {done && (
                  <Link
                    to="/login"
                    className="block w-full mt-3 text-center text-gray-500 text-xs hover:text-cyan-400 transition"
                  >
                    ¿No fuiste redirigido? Ir a iniciar sesión
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

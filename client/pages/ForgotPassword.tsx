import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { supabase } from "@/services/supabase";
import Navigation from "@/components/htk/Navigation";
import Footer from "@/components/htk/Footer";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // No revelamos si el error es "email no existe" vs otro — Supabase no
      // distingue eso en la respuesta para evitar enumeración de usuarios.
      // Solo mostramos error en fallas reales de red/servidor; si hay `error`
      // seguimos mostrando el estado de éxito igual, por la misma razón.
      const status = resetError?.status;
      if (status !== undefined && (status === 0 || status >= 500)) {
        setError("Error de servidor. Intenta nuevamente en unos minutos.");
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Error inesperado. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white font-inter flex flex-col">
      <Navigation />

      <main className="flex-1 relative flex flex-col items-center justify-center px-4 py-16 sm:py-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="htk-chip htk-chip-accent mb-5 inline-flex">
              <ShieldCheck className="w-3 h-3" />
              Recuperar acceso
            </span>
            <h1 className="htk-display text-4xl sm:text-5xl text-white mt-5 leading-[0.9]">
              ¿Olvidaste tu
              <br />
              <span className="text-cyan-400">contraseña?</span>
            </h1>
            <p className="text-gray-400 text-sm mt-4 leading-relaxed">
              Ingresa tu email y te enviaremos un link para restablecerla.
            </p>
          </div>

          <div className="bg-[#13182a]/70 backdrop-blur-xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-[0_30px_80px_-30px_rgba(0,212,255,0.15)] p-7 sm:p-8">
            {sent ? (
              <div className="flex flex-col items-center text-center gap-3 py-2">
                <CheckCircle2 className="w-10 h-10 text-cyan-400" />
                <p className="text-white text-sm font-semibold">
                  Si el correo está registrado, te enviamos un link para restablecer
                  tu contraseña.
                </p>
                <p className="text-gray-500 text-xs">
                  Revisa tu bandeja de entrada (y la carpeta de spam).
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
                <label className="block">
                  <span className="sr-only">Email</span>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      placeholder="Tu email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      autoComplete="email"
                      required
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
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
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
                      Enviando…
                    </>
                  ) : (
                    <>
                      Enviar link de recuperación
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            <Link
              to="/login"
              className="w-full mt-4 flex items-center justify-center gap-1.5 text-center text-gray-500 text-xs hover:text-cyan-400 transition"
            >
              <ArrowLeft className="w-3 h-3" />
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

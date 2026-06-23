# Recuperación de contraseña — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar vida al botón "¿Olvidaste tu contraseña?" de `Login.tsx`, agregando un flujo completo de recuperación de contraseña vía dos páginas públicas nuevas (`/forgot-password`, `/reset-password`) que usan el flujo nativo de Supabase Auth.

**Architecture:** Dos componentes de página nuevos en `client/pages/`, sin backend custom — Supabase Auth maneja el envío del email y la sesión temporal de recuperación. `ResetPassword.tsx` reutiliza el estado `user`/`loading`/`userRole` que ya expone `AuthContext` (la misma suscripción global a `onAuthStateChange` recibe el evento de recuperación), siguiendo el mismo patrón de espera que ya usa `ProtectedRoute.tsx`.

**Tech Stack:** React + TypeScript, react-router-dom, supabase-js (`supabase.auth.resetPasswordForEmail`, `supabase.auth.updateUser`), sonner (toasts), lucide-react (íconos), Tailwind.

Spec completo: `docs/superpowers/specs/2026-06-23-reset-password-design.md`.

---

### Task 1: Página `ForgotPassword.tsx`

**Files:**
- Create: `client/pages/ForgotPassword.tsx`

- [ ] **Step 1: Crear el archivo con el formulario completo**

```tsx
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
      if (resetError && resetError.status && resetError.status >= 500) {
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
```

- [ ] **Step 2: Verificar que el proyecto compila**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run typecheck`
Expected: sin errores nuevos relacionados a `ForgotPassword.tsx` (el archivo aún no está
importado en ninguna ruta, así que typecheck solo valida que el archivo en sí es válido).

- [ ] **Step 3: Commit**

```bash
git add client/pages/ForgotPassword.tsx
git commit -m "feat(auth): add forgot-password page"
```

---

### Task 2: Página `ResetPassword.tsx`

**Files:**
- Create: `client/pages/ResetPassword.tsx`

- [ ] **Step 1: Crear el archivo con el formulario completo**

```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    navigate(userRole === "teacher" ? "/dashboard/teacher" : "/dashboard/student", {
      replace: true,
    });
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
                <a
                  href="/forgot-password"
                  className="
                    mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                    bg-cyan-400 hover:bg-cyan-300 text-[#0a0e1a] font-bold text-sm
                    transition-all duration-200 ease-out active:scale-[0.98]
                  "
                >
                  Solicitar un nuevo link
                </a>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
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
                  disabled={submitting || done || !password || !confirmPassword}
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
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
```

**Notas de diseño aplicadas en este código** (justificación de decisiones no obvias):
- `user`/`loading`/`userRole` vienen de `useAuth()`, no de un listener propio: la
  suscripción global de `AuthContext` a `onAuthStateChange` ya recibe el evento
  `PASSWORD_RECOVERY` que Supabase dispara al procesar el token de la URL, así que
  duplicar el listener sería redundante (confirmado leyendo `AuthContext.tsx:24-67`).
- El estado `"checking"` del spec se mapea a `authLoading` (ya existe en el contexto);
  `"invalid"` se mapea a `!user` tras `authLoading` resolver a `false`; `"ready"` es
  `!!user`. No se necesita un cuarto estado local.
- La redirección post-éxito espera a `userRole` (no solo a `done`) por la misma razón
  que `ProtectedRoute.tsx:31` espera el rol antes de decidir destino — la sesión ya
  existe pero el rol puede tardar un tick más en resolverse desde los claims del JWT.

- [ ] **Step 2: Verificar que el proyecto compila**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run typecheck`
Expected: sin errores nuevos relacionados a `ResetPassword.tsx`.

- [ ] **Step 3: Commit**

```bash
git add client/pages/ResetPassword.tsx
git commit -m "feat(auth): add reset-password page"
```

---

### Task 3: Rutas en `App.tsx` y link funcional en `Login.tsx`

**Files:**
- Modify: `client/App.tsx:13-20` (imports), `client/App.tsx:43-95` (rutas)
- Modify: `client/pages/Login.tsx:1-2` (import), `client/pages/Login.tsx:309-315` (botón)

- [ ] **Step 1: Agregar los imports lazy en `App.tsx`**

En `client/App.tsx`, después de la línea `import NotFound from "./pages/NotFound";` (línea 14)
y antes del bloque de lazy imports existente (línea 16-20), no se cambia el orden — se agrega
junto a los otros lazy imports:

```tsx
// Lazy load heavy pages
const Booking = lazy(() => import("./pages/Booking"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const StudentCalendar = lazy(() => import("./pages/StudentCalendar"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
```

(Esto reemplaza el bloque actual de `client/App.tsx:16-20`, agregando las 2 líneas nuevas
al final.)

- [ ] **Step 2: Agregar las rutas**

En `client/App.tsx`, inmediatamente después de la ruta `/login` (línea 53,
`<Route path="/login" element={<Login />} />`), agregar:

```tsx
            <Route path="/login" element={<Login />} />
            <Route
              path="/forgot-password"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ForgotPassword />
                </Suspense>
              }
            />
            <Route
              path="/reset-password"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <ResetPassword />
                </Suspense>
              }
            />
```

- [ ] **Step 3: Conectar el botón "¿Olvidaste tu contraseña?" en `Login.tsx`**

Agregar el import de `Link` en `client/pages/Login.tsx:2` (cambiar):

```tsx
import { useNavigate, Link } from "react-router-dom";
```

Reemplazar el bloque de `client/pages/Login.tsx:309-315`:

```tsx
              {/* Forgot password */}
              <button
                type="button"
                className="w-full mt-4 text-center text-gray-500 text-xs hover:text-cyan-400 transition"
              >
                ¿Olvidaste tu contraseña?
              </button>
```

por:

```tsx
              {/* Forgot password */}
              <Link
                to="/forgot-password"
                className="block w-full mt-4 text-center text-gray-500 text-xs hover:text-cyan-400 transition"
              >
                ¿Olvidaste tu contraseña?
              </Link>
```

- [ ] **Step 4: Verificar que el proyecto compila**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add client/App.tsx client/pages/Login.tsx
git commit -m "feat(auth): wire forgot/reset-password routes and login link"
```

---

### Task 4: Regresión y verificación manual end-to-end

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Levantar el dev server**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run dev`
Expected: Vite listo en `http://localhost:8080`.

- [ ] **Step 2: Correr la suite de tests**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run test`
Expected: mismo resultado que antes de este trabajo (36/37, con la falla preexistente y
no relacionada de `phase-5-features.spec.ts` aceptada por el usuario). Ningún test nuevo
debería fallar porque esta feature no agrega tests automatizados (justificado en el spec:
son formularios delgados sobre `supabase.auth`, sin lógica pura que testear).

- [ ] **Step 3: Confirmar en el dashboard de Supabase las Redirect URLs**

Antes de probar el flujo real, confirmar con el usuario que ya agregó (o agregar junto
con él) en Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
- `http://localhost:8080/reset-password`
- `https://htk-topolinos.netlify.app/reset-password`

Sin esto, `resetPasswordForEmail` con `redirectTo` apuntando a esas URLs falla o el link
del correo no resuelve correctamente.

- [ ] **Step 4: Probar el flujo completo en el navegador**

1. Ir a `http://localhost:8080/login`, click en "¿Olvidaste tu contraseña?" → confirmar
   que navega a `/forgot-password`.
2. Ingresar un email de prueba real (uno de los perfiles de prueba en Supabase) y enviar.
   Confirmar que se muestra el mensaje de éxito.
3. Revisar la bandeja de entrada del email de prueba, abrir el correo de Supabase y hacer
   click en el link de recuperación.
4. Confirmar que se llega a `/reset-password` y el formulario de nueva contraseña se
   muestra (no el estado de error).
5. Ingresar una contraseña nueva (≥6 caracteres) y confirmarla, enviar.
6. Confirmar el toast de éxito y la redirección automática al dashboard correspondiente
   al rol de esa cuenta.
7. Cerrar sesión y volver a iniciar sesión con la contraseña nueva en `/login` para
   confirmar que el cambio quedó persistido.
8. Navegar directo a `http://localhost:8080/reset-password` sin pasar por el link del
   correo (sesión nueva/incógnito) → confirmar que se muestra el estado de "link no
   válido o vencido" con el botón "Solicitar un nuevo link".

- [ ] **Step 5: Commit final si hubo ajustes**

Si el paso 4 requirió cambios de copy/estilo, commitearlos:

```bash
git add -A
git commit -m "fix(auth): ajustes post-verificación manual del flujo de reset password"
```

Si no hubo cambios, no se necesita commit en este task.

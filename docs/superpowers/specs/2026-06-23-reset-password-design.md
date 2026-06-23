# Recuperación de contraseña

**Fecha:** 2026-06-23
**Estado:** Aprobado para implementación

## Contexto

El Login (`client/pages/Login.tsx:310-315`) tiene un botón "¿Olvidaste tu contraseña?"
sin funcionalidad (sin `onClick`, no navega a ningún lado). No existe ningún flujo de
recuperación de contraseña en la app: `AuthContext.tsx` no expone métodos de reset/update,
y no hay llamadas a `supabase.auth.resetPasswordForEmail` ni `supabase.auth.updateUser`
en todo el repo.

Supabase Auth ya soporta este flujo de forma nativa (envío de email con link de
recuperación + sesión temporal al hacer click) — no se necesita backend custom ni
Netlify function nueva.

## Alcance

**Incluido:**
1. Página `/forgot-password`: el usuario ingresa su email, se dispara el correo de
   recuperación de Supabase.
2. Página `/reset-password`: destino del link del correo, donde el usuario define su
   nueva contraseña.
3. Conectar el botón "¿Olvidaste tu contraseña?" de `Login.tsx` a `/forgot-password`.
4. Documentar (no código) la configuración manual requerida en el dashboard de Supabase
   (Redirect URLs).

**Fuera de alcance:**
- Cambio de contraseña desde dentro del dashboard ya logueado (Configuración de cuenta)
  — es un flujo distinto, no relacionado al de recuperación por olvido.
- Personalización de la plantilla de email de recuperación dentro de Supabase (se usa
  la plantilla default de Supabase, no la de `netlify/functions/_email.ts`, porque ese
  envío lo dispara Supabase Auth directamente, no nuestra función).

## Diseño

### `client/pages/ForgotPassword.tsx` (ruta pública `/forgot-password`)

- Formulario de un campo: email.
- Al enviar: `supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })`.
- Siempre muestra el mismo mensaje de éxito tras enviar, exista o no el email
  (`"Si el correo está registrado, te enviamos un link para restablecer tu contraseña"`)
  — no se revela si un email existe en el sistema, por seguridad.
- Mientras espera la respuesta, botón en estado loading (mismo patrón que `Login.tsx`).
- Si `resetPasswordForEmail` devuelve un error de red/servidor (no de "email no existe",
  Supabase no distingue eso en la respuesta), se muestra un mensaje de error genérico.
- Link "Volver a iniciar sesión" → `/login`.
- Estilo visual idéntico a `Login.tsx`: fondo `#0a0e1a`, card `bg-[#13182a]/70
  rounded-3xl`, acento cyan `#00d4ff`/`text-cyan-400`, `font-inter`, input con ícono
  `Mail` de lucide-react a la izquierda.

### `client/pages/ResetPassword.tsx` (ruta pública `/reset-password`)

- Al montar, se suscribe a `supabase.auth.onAuthStateChange` y también llama
  `supabase.auth.getSession()` para cubrir el caso de que el evento `PASSWORD_RECOVERY`
  ya se haya disparado antes de montar el listener.
- Estado `status`: `"checking" | "ready" | "invalid"`.
  - `"checking"`: mientras se verifica la sesión (spinner).
  - `"ready"`: hay sesión válida (vino del link de recuperación) → muestra el formulario.
  - `"invalid"`: no hay sesión tras la verificación (alguien navegó directo a la URL, o el
    link venció) → mensaje de error + botón "Solicitar un nuevo link" → `/forgot-password`.
- Formulario (solo visible en estado `"ready"`): nueva contraseña + confirmar contraseña.
  - Validación: mínimo 6 caracteres (mismo mínimo que `admin-create-patient.ts:85`), y
    ambos campos deben coincidir. Errores inline, mismo estilo que `Login.tsx` (alerta
    `bg-rose-500/10 border-rose-500/25 text-rose-300`).
- Al enviar: `supabase.auth.updateUser({ password })`.
  - Éxito: `toast.success("Contraseña actualizada")`, luego redirección según
    `userRole` (de `useAuth()`): `"teacher"` → `/dashboard/teacher`, `"student"` →
    `/dashboard/student`. Si `userRole` aún no resolvió, esperar brevemente a que
    `AuthContext` lo determine antes de redirigir (mismo mecanismo que ya usa
    `ProtectedRoute` para esperar la carga del rol).
  - Error: `toast.error` con el mensaje de Supabase, el formulario queda disponible para
    reintentar.
- Mismo estilo visual que `ForgotPassword.tsx`/`Login.tsx`.

### Cambios en archivos existentes

- **`client/pages/Login.tsx:310-315`**: el `<button>` sin handler se reemplaza por
  `<Link to="/forgot-password">` con las mismas clases visuales.
- **`client/App.tsx`**: dos rutas públicas nuevas (sin `ProtectedRoute`), lazy-loaded
  igual que `Booking`:
  ```tsx
  const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
  const ResetPassword = lazy(() => import("./pages/ResetPassword"));
  // ...
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route path="/reset-password" element={<ResetPassword />} />
  ```
- **`client/contexts/AuthContext.tsx`**: sin cambios. Ambas páginas llaman a `supabase`
  importado de `@/services/supabase` directamente, igual que el resto de la app (la
  mayoría de las llamadas a `supabase.auth.*` no pasan por el contexto, salvo
  `signIn`/`signOut`).

### Configuración manual fuera del código

En el dashboard de Supabase (Authentication → URL Configuration → Redirect URLs), agregar:
- `https://htk-topolinos.netlify.app/reset-password`
- `http://localhost:8080/reset-password` (para desarrollo local)

Sin este paso, Supabase rechaza el `redirectTo` y el link del correo no funciona. Este
paso lo realiza el usuario manualmente (fuera de alcance de la implementación en código).

## Testing

- Sin tests automatizados nuevos: ambas páginas son formularios delgados sobre llamadas
  directas a `supabase.auth`, sin lógica pura extraíble (a diferencia de
  `client/lib/evaluations.ts`, que sí justificó tests unitarios). Se valida manualmente
  en el navegador: flujo completo de "olvidé mi contraseña" → email → reset → redirección.

## Validación de cierre

Verificación manual end-to-end contra el proyecto Supabase real (`lvxktbecpvmbcuucjxpp`):
solicitar reset con un email de prueba existente, click en el link recibido, confirmar que
`/reset-password` detecta la sesión de recuperación, cambiar la contraseña, confirmar
redirección al dashboard correcto, y confirmar que el login posterior funciona con la
contraseña nueva.

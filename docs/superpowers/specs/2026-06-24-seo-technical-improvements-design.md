# Mejoras de SEO técnico

**Fecha:** 2026-06-24
**Estado:** Aprobado para implementación

## Contexto

`BRAND_SEO_HANDOFF.md` (adjuntado por el usuario) describe una serie de mejoras de SEO
técnico pendientes: el sitio no tiene meta tags dinámicos por página, no tiene Open
Graph/Twitter Card, no tiene canonical tags, no tiene structured data (JSON-LD), no
tiene `sitemap.xml`, `robots.txt` no referencia un sitemap, las rutas privadas del
dashboard no están marcadas `noindex`, `index.html` declara `lang="en"` en un sitio en
español, y el manifest.json reutiliza el favicon como ícono PWA en sus 3 tamaños (gap
conocido, sin asset de reemplazo disponible).

Se confirmó contra el estado real del código (no solo contra lo que dice el handoff):
- `react-helmet-async` NO está instalado.
- No existe ningún componente de SEO/meta tags hoy.
- `Footer.tsx` consume `app_settings` de Supabase con fallbacks hardcodeados
  (`center_name="HTK Center"`, `center_phone`, `center_email`, `center_address="José
  Domingo Cañas #1563"` sin comuna, `whatsapp_phone`, `instagram_url`, `tiktok_handle`).
- `public/sitemap.xml` no existe. `public/robots.txt` existe pero sin línea `Sitemap:`.
- `.env` no tiene `VITE_SITE_URL`.
- El deploy real está en `https://htk-topolinos.netlify.app`, pero el handoff usa
  `https://htkcenter.netlify.app` como dominio de marca — se decidió usar el del
  handoff (ver Decisiones).
- Las rutas nuevas `/dashboard/patients/:id` y `/dashboard/teachers/:id` (creadas en el
  sub-proyecto A, PR #22, aún no mergeado a `main` al momento de escribir este spec)
  también deben quedar `noindex`, igual que las 4 rutas `/dashboard*` que el handoff
  listaba originalmente.

## Decisiones tomadas con el usuario

1. **Dominio para `VITE_SITE_URL`:** `https://htkcenter.netlify.app` (el del handoff),
   no el dominio real de deploy actual (`htk-topolinos.netlify.app`). Es una decisión
   de marca, no técnica — el usuario la tomó explícitamente sabiendo la diferencia.
2. **Cobertura de `noindex`:** todas las rutas privadas actuales, incluyendo las dos
   nuevas de detalle de alumno/profesor del sub-proyecto A.
3. **Footer.tsx:** se actualiza el texto visible de la dirección para incluir la
   comuna ("Ñuñoa"), no solo el JSON-LD. Cambio de copy menor, consistente con el dato
   ya usado en structured data.
4. **Gap de íconos del manifest:** no se modifica `manifest.json` (es JSON estricto,
   sin soporte de comentarios, y no hay asset real para reemplazar el favicon). Se deja
   constancia del pendiente en un archivo nuevo `public/ICONS_TODO.md`.

## Alcance

**Incluido:**
1. Componente reutilizable `<Seo>` basado en `react-helmet-async`.
2. `<HelmetProvider>` envolviendo la app en `client/App.tsx`.
3. `<Seo>` aplicado a 4 páginas públicas (title/description/canonical/OG/Twitter,
   indexables) y 6 rutas privadas (mismo componente, `noindex={true}`).
4. `index.html`: `lang="en"` → `lang="es-CL"`.
5. JSON-LD `HealthAndBeautyBusiness` en `Index.tsx`, con datos reales de `app_settings`.
6. `Footer.tsx`: agregar "Ñuñoa" al texto visible de la dirección.
7. `public/sitemap.xml` nuevo, con las 4 rutas públicas.
8. `public/robots.txt`: agregar línea `Sitemap:`.
9. `VITE_SITE_URL` en `.env`.
10. `public/ICONS_TODO.md` documentando el gap de íconos del manifest.

**Explícitamente fuera de alcance:**
- `og:image` — no existe ningún asset de marca listo; no se genera ni se referencia una
  imagen rota. Se agrega en un trabajo futuro cuando exista el asset.
- Modificar `manifest.json` en sí (ver Decisión 4).
- Cualquier copy de marketing más allá del agregado puntual de "Ñuñoa" en `Footer.tsx`.
- Cambios al sub-proyecto A (modal→página) más allá de agregarle `<Seo noindex>` a sus
  rutas — no se reabre ese trabajo.
- Verificación con Google Search Console / envío real del sitemap — eso ocurre después
  del deploy, fuera del alcance de este repo.

## Componente `<Seo>`

`client/components/Seo.tsx`:

```ts
interface SeoProps {
  title: string;
  description: string;
  path: string;        // ej "/login"
  noindex?: boolean;
}
```

Usa `import.meta.env.VITE_SITE_URL` para construir `canonical`/`og:url` a partir de
`path`. Renderiza vía `<Helmet>`:
- `<title>{title}</title>`
- `<meta name="description" content={description} />`
- `<link rel="canonical" href={`${SITE_URL}${path}`} />`
- `<meta property="og:type" content="website" />`
- `<meta property="og:title" content={title} />`
- `<meta property="og:description" content={description} />`
- `<meta property="og:url" content={`${SITE_URL}${path}`} />`
- `<meta property="og:site_name" content="HTK Center" />`
- `<meta name="twitter:card" content="summary_large_image" />`
- `<meta name="twitter:title" content={title} />`
- `<meta name="twitter:description" content={description} />`
- Si `noindex`: `<meta name="robots" content="noindex,nofollow" />`

## Páginas y contenido

**Públicas (indexables):**
| Página | path | title | description |
|---|---|---|---|
| `Index.tsx` | `/` | "HTK Center — Entrenamiento integral en Ñuñoa" | Descripción breve del centro (kinesiología, nutrición, entrenamiento) |
| `Login.tsx` | `/login` | "Iniciar sesión — HTK Center" | "Accede a tu cuenta de alumno o profesional en HTK Center." |
| `ForgotPassword.tsx` | `/forgot-password` | "Recuperar contraseña — HTK Center" | "Recupera el acceso a tu cuenta de HTK Center." |
| `ResetPassword.tsx` | `/reset-password` | "Restablecer contraseña — HTK Center" | "Crea una nueva contraseña para tu cuenta de HTK Center." |

**Privadas (`noindex`):**
`/dashboard`, `/dashboard/teacher`, `/dashboard/student`, `/dashboard/student/calendar`,
`/dashboard/patients/:id`, `/dashboard/teachers/:id` — title genérico por rol (ej.
"Panel del profesional — HTK Center"), sin necesidad de description elaborada ya que
nunca se indexan.

## JSON-LD (solo en `Index.tsx`)

```json
{
  "@context": "https://schema.org",
  "@type": "HealthAndBeautyBusiness",
  "name": "{center_name de app_settings}",
  "telephone": "{center_phone}",
  "email": "{center_email}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "{center_address}",
    "addressLocality": "Ñuñoa",
    "addressCountry": "CL"
  },
  "sameAs": ["{instagram_url}", "https://www.tiktok.com/@{tiktok_handle}"]
}
```

Se obtiene con el mismo hook/fetch de `app_settings` que ya usa `Footer.tsx` (no se
duplica lógica de fetch — si `Index.tsx` no tiene ya acceso a esos datos, se llama al
mismo servicio que usa `Footer.tsx`). Renderizado vía `<script type="application/ld+json">`
dentro de un `<Helmet>` adicional en `Index.tsx` (separado del `<Seo>` genérico, ya que
es contenido específico de esa página).

## `Footer.tsx`

El texto de dirección pasa de:
```
{center_address}
```
a:
```
{center_address}, Ñuñoa
```
Solo si `center_address` no está vacío (mismo guard que ya existe para el render
condicional de esa línea).

## `sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://htkcenter.netlify.app/</loc></url>
  <url><loc>https://htkcenter.netlify.app/login</loc></url>
  <url><loc>https://htkcenter.netlify.app/forgot-password</loc></url>
  <url><loc>https://htkcenter.netlify.app/reset-password</loc></url>
</urlset>
```

## `robots.txt`

Se agrega al final del archivo existente:
```
Sitemap: https://htkcenter.netlify.app/sitemap.xml
```

## `.env`

Se agrega:
```
VITE_SITE_URL=https://htkcenter.netlify.app
```

## `public/ICONS_TODO.md`

```markdown
# Pendiente: íconos reales del manifest

`public/manifest.json` reutiliza `favicon.ico` para los 3 tamaños de ícono PWA
(32x32, 192x192, 512x512). Reemplazar por assets de marca reales (PNG en los tamaños
correctos) cuando estén disponibles.
```

## Archivos a tocar

- **Crear:** `client/components/Seo.tsx`, `public/sitemap.xml`, `public/ICONS_TODO.md`
- **Modificar:** `client/App.tsx` (`HelmetProvider` + `<Seo>` en cada ruta/página),
  `client/pages/Index.tsx` (`<Seo>` + JSON-LD), `client/pages/Login.tsx`,
  `client/pages/ForgotPassword.tsx`, `client/pages/ResetPassword.tsx`,
  `client/pages/TeacherDashboard.tsx`, `client/pages/StudentDashboard.tsx`,
  `client/pages/StudentCalendar.tsx`, `client/pages/PatientDetailPage.tsx`,
  `client/pages/TeacherDetailPage.tsx`,
  `client/components/htk/Footer.tsx`, `index.html`, `public/robots.txt`, `.env`,
  `package.json` (agregar `react-helmet-async`)

## Testing

Sin tests automatizados nuevos — son meta tags y archivos estáticos sin lógica de
negocio. Validación manual: inspeccionar `<head>` renderizado en cada página (via
DevTools) confirmando title/description/canonical/OG/Twitter correctos y `noindex` solo
en rutas privadas; validar el JSON-LD con el Rich Results Test de Google; confirmar
`sitemap.xml` y `robots.txt` accesibles por URL directa.

## Validación de cierre

Revisión manual en navegador de las 4 páginas públicas y al menos 2 páginas privadas
(una de alumno, una de profesor) confirmando el `<head>` correcto, más lectura del
`sitemap.xml`/`robots.txt`/`ICONS_TODO.md` generados.

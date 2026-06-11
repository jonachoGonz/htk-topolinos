# HTK Center — Design System

> Documento vivo del sistema de diseño. La fuente de verdad es el código (`client/`);
> este doc lo resume para handoff. Última sincronización con `main`: ver commit en la cabecera del repo.

---

## 1. Voz y registro

**Producto, no marca.** La voz tiende a operativa y clara, no a slogans.

- Confianza, no superlativos. "Adaptado a ti" en lugar de "el mejor".
- Tutela el "tú/tu" (informal cercano), nunca "usted".
- Honestidad antes que aspiración. Si el centro no tiene N atletas, no se inventa.
- Microcopy directo: verbo + objeto en CTAs ("Renovar plan", "Agendar cita").

### Anti-patrones de copy a evitar
- ❌ "Tecnología de última generación"
- ❌ "Análisis preciso del movimiento"
- ❌ "Más de X años de experiencia" (sin datos)
- ❌ "98% de éxito", "+500 atletas" (números falsos)
- ✅ "Evaluamos según tus necesidades"
- ✅ "Seguimiento cercano y plan que se adapta a tu evolución"
- ✅ "Atención personalizada 1 a 1"

---

## 2. Paleta de color (tokens)

Dark-first con acento cyan. Implementado vía Tailwind + colores literales en clases JIT.

### Brand
| Token | Hex | Uso |
|---|---|---|
| `brand.cyan`     | `#00D4FF` | Acción primaria, énfasis, links activos |
| `brand.cyanSoft` | `#7DEAFF` (cyan-300) | Hover state del cyan |

### Superficie / Fondo (dark theme)
| Token | Hex | Uso |
|---|---|---|
| `bg.base`    | `#05050A` | Background app principal |
| `bg.surface` | `#0A0E1A` | Modales, contenedores hero |
| `bg.raised`  | `#0F131A` | Cards, paneles internos |

### Tinta (texto)
| Token | Hex | Uso |
|---|---|---|
| `ink.white`     | `#FFFFFF`         | Headings y stat values |
| `ink.gray300`   | `#D1D5DB`         | Body text sobre dark |
| `ink.gray400`   | `#9CA3AF`         | Captions, hints |
| `ink.gray500`   | `#71717A`         | Labels, secondary |

### Status semánticos
| Token | Hex | Significado |
|---|---|---|
| `status.emerald` | `#10B981` | Éxito, asistencia, plan activo |
| `status.amber`   | `#F59E0B` | Atención, "por confirmar", "por vencer" |
| `status.red`     | `#EF4444` | Error, ausente, vencido |
| `status.purple`  | `#A855F7` | Alumnos / métricas frías |
| `status.sky`     | `#2B9DED` | Khipu, info secundaria |

### Reglas de combinación
- **Texto sobre `bg.raised`**: usar `ink.white` para headings, `ink.gray400` para body.
- **Texto sobre brand cyan**: usar `bg.base` (#05050A), nunca blanco.
- **Bordes sutiles**: `rgba(255,255,255,0.06)` (clase `border-white/[0.06]`).
- **Hover sutil**: `rgba(255,255,255,0.04)` (`hover:bg-white/[0.04]`).

---

## 3. Tipografía

Tres familias, cada una con un rol claro. Definidas en `tailwind.config.ts`.

| Familia | Rol | Tailwind class |
|---|---|---|
| **Montserrat** | Display / headings principales | `font-montserrat` |
| **Lexend** | Subheadings, cards, semi-display | `font-lexend` |
| **Inter** | Body, labels, UI controls | `font-inter` |
| Bebas Neue (display extra) | Hero numéricos, used rarely | `font-display` |

### Escala tipográfica (Tailwind)

| Token | Px | Uso típico |
|---|---|---|
| `text-[10px]` | 10 | Eyebrow labels uppercase, captions |
| `text-xs` (12) | 12 | Hints, footer, badges |
| `text-sm` (14) | 14 | Body text, button labels |
| `text-base` (16) | 16 | Form inputs, paragraphs |
| `text-lg` (18) | 18 | Card titles |
| `text-xl` (20) | 20 | Section headings (H3) |
| `text-2xl` (24) | 24 | Page titles (H2/H1) |
| `text-3xl` (30) | 30 | Stat values |
| `text-4xl` (36) | 36 | Hero stats |

### Eyebrow / label uppercase
Patrón recurrente: `text-[10px] uppercase tracking-[0.18em] text-gray-500 font-inter`. Usado para labels arriba de stat cards y secciones.

### tabular-nums
Todos los números (montos, conteos, fechas) usan `tabular-nums` para alineación monoespaciada.

---

## 4. Espaciado y layout

Sistema de spacing Tailwind (4px base). Convenciones más usadas:

| Class | Px | Uso |
|---|---|---|
| `gap-2` | 8 | Inline chips, small inline groups |
| `gap-3` | 12 | Default form fields, card body |
| `gap-4` | 16 | Section gap |
| `gap-6` | 24 | Major sections |
| `p-4` | 16 | Card padding mobile |
| `p-5` / `p-6` | 20 / 24 | Card padding desktop |
| `rounded-lg` | 8 | Buttons, chips, inputs |
| `rounded-xl` | 12 | Cards |
| `rounded-2xl` | 16 | Hero panels |
| `rounded-full` | 9999 | Pills, avatars, chips estado |

### Sticky bottom safe area (mobile)
Bottom nav fija usa `pb-[calc(80px+env(safe-area-inset-bottom))]` en el `<main>` para no tapar contenido en iPhones con notch.

### Breakpoints
- `sm`: 640px
- `md`: 768px (oculta nav del topbar profesor)
- `lg`: 1024px (sidebar visible, oculta bottom-nav y topbar nav)
- `xl`: 1280px

---

## 5. Componentes (inventario)

### 5.1 Atoms

#### Button (primary cyan)
```tsx
<button className="px-4 py-2 rounded-lg bg-[#00d4ff] hover:bg-cyan-300
                   text-[#05050A] text-sm font-bold transition
                   disabled:opacity-40 flex items-center gap-2 min-h-[40px]
                   focus-visible:outline-none focus-visible:ring-2
                   focus-visible:ring-[#00d4ff]/60">
  <Icon className="w-4 h-4" /> Label
</button>
```
**Tamaños** min-height `40` (md) / `44` (touch). Iconos `w-4 h-4` (16px).

#### Button (secondary)
```tsx
<button className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10
                   text-white text-sm font-semibold hover:bg-white/[0.08]">
```

#### Button (danger)
- Misma estructura, color `bg-red-500/15 border border-red-500/25 text-red-300`.

#### Input
```tsx
<input className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg
                  px-3 py-2 text-sm text-white min-h-[40px]
                  focus:border-[#00d4ff]/40 focus:outline-none" />
```
Label arriba en `text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 block`.

#### Badge / Pill estado
```tsx
<span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full
                 border text-xs font-semibold
                 bg-emerald-500/10 border-emerald-500/20 text-emerald-300">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
  Activo
</span>
```
Variantes color: emerald (Activo), amber (Por vencer), red (Vencido).

### 5.2 Molecules

#### StatCard
**Source:** `client/components/dashboard/sections/DashboardSection.tsx` `StatCard()`.

```tsx
<div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5">
  <div className="flex items-start justify-between mb-3">
    <p className="text-gray-500 text-xs uppercase tracking-wider">{label}</p>
    <div className="w-9 h-9 rounded-lg flex items-center justify-center
                    text-[#00d4ff] bg-[#00d4ff]/10">{icon}</div>
  </div>
  <div className="flex items-baseline gap-2">
    <span className="text-3xl font-bold text-white tabular-nums">{value}</span>
    {unit && <span className="text-gray-400 text-sm">{unit}</span>}
  </div>
  {hint && <p className="text-[10px] text-gray-500 mt-2">{hint}</p>}
</div>
```

5 paletas de color: cyan (default), emerald, amber, red, purple.

#### NavItem (sidebar)
**Source:** `client/components/dashboard/Sidebar.tsx`. Botón ancho completo con icono 16px + label. Estado activo: barra cyan a la izquierda + texto cyan + bg `[#00d4ff]/[0.08]`.

#### TabBtn
**Source:** `client/components/dashboard/PatientDetailModal.tsx`. Underline cyan en activo, gray en idle.

#### MetricTile (small stat)
**Source:** `client/components/dashboard/sections/StudentDashboardSection.tsx` `MetricTile()`. Bg darker (`#05050A`), label uppercase, valor + unit + delta opcional con flecha arriba/abajo.

#### PlanCard (pricing)
Cyan border si default, label en blanco, lista features, CTA Mercado Pago + Khipu.

#### EmptyState
Pattern: icon (40px circle, color tema) + heading + paragraph + CTA opcional. Padding `p-8 text-center`.

### 5.3 Organisms

#### PatientDetailModal
Modal con header (alertas críticas si aplica), 5 tabs (Datos / Notas / Asistencia / Evaluaciones / Profesionales / Pausar). Layout `max-w-4xl`, `max-h-[95vh]`, scroll interno.

#### TeacherDetailModal
Wrapper más simple sobre `TeacherProfileForm`. Solo header + scrollable body.

#### OnboardingWizard
Fixed overlay, 3 pasos (welcome → profile → done) con progress bar arriba. Bloqueante hasta completar PAR-Q + consentimiento.

#### AdminReports widgets
- BarChart ingresos mensuales (recharts)
- BarChart horizontal de planes por duración
- LineChart tendencia asistencia con filtro de rango (7/30/90/365 días, granularidad adaptativa)
- PieChart distribución planes activos

---

## 6. Patrones de UX

### Navegación
- **Mobile (<md)**: Sidebar oculto detrás de hamburger + BottomNav fija.
- **Tablet (md..lg)**: Topbar muestra los tabs principales, sidebar oculto.
- **Desktop (lg+)**: Sidebar visible, topbar minimal (solo notificaciones + avatar).

### Modales
- Backdrop `bg-black/70`, click fuera cierra.
- Header con close `X` arriba a la derecha.
- Body scrollable, sticky footer con acciones (Cancelar / Confirmar).
- En mobile: padding reducido a `p-2`, height `max-h-[95vh]`.

### Loading
- Inputs / botones: `<Loader2 className="w-4 h-4 animate-spin" />` reemplaza el icono.
- Listas: skeleton cards (`<SkeletonStat />`) en lugar de spinner centrado.
- Tablas: spinner inline centrado.

### Toasts (sonner)
- `toast.success("...")` → verde
- `toast.error("Error: ${e}")` → rojo
- `toast.message("...")` → neutro

### Forms
- Validación inline con toast.error en submit (no inline-field por field todavía).
- Inputs con `min-h-[40px]` siempre, `tabular-nums` en numéricos.
- "Generar contraseña aleatoria" + checkbox "Enviar invitación por email" como atajos UX en crear paciente/profesor.

---

## 7. Páginas principales

### Auth
- `/login` — tabs Alumno/Profesional, fondo hero con imagen Unsplash temporal.

### Student
- `/dashboard/student` — Mi Panel: card Plan + card Mis clases + Evaluación corporal + Evaluación fuerza.
- `?tab=calendario` — Calendar booking del alumno.
- `?tab=pagos` — Historial planes (colapsable) + Comprar/Renovar con botones MP / Khipu.
- `?tab=messages` — Lista conversaciones + chat panel.
- `?tab=configuracion` — Settings, foto, datos.

### Teacher
- `/dashboard` (activeTab=dashboard) — Panel: stats + próximas clases + cancelaciones + planes por vencer + heatmap + evaluación pendiente + nutri pendiente.
- `?tab=calendar` — Agenda (día/semana/mes) + Disponibilidades + Holidays.
- `?tab=patients` — Lista pacientes asignados (filtro M2M para no-admin).
- `?tab=messages` — Mensajes con alumnos.
- `?tab=profile` — Mi Perfil profesional.

### Admin (subset del Teacher con tab extra)
- `?tab=admin` (solo si is_admin) → AdminSection con 6 sub-tabs:
  1. Reportes — gráficos KPI
  2. Alumnos — PatientsList(roleFilter=student)
  3. Profesionales — PatientsList(roleFilter=teacher)
  4. Planes — gestión templates
  5. Asignar planes — bulk asignar plan a alumnos
  6. Configuración — AppSettings (nombre centro, tagline, IG, teléfono, etc.)

### Landing
- `/` — Index: Hero + About + Services + Pricing + Footer.

---

## 8. Capturas

Snapshot del estado actual de las pantallas principales (capturadas con Playwright durante QA):

| Pantalla | Archivo |
|---|---|
| Panel profesor desktop | `docs/screenshots/teacher-01-panel.png` |
| Panel admin (verificación post-fix FK) | `docs/screenshots/verify-teacher-panel-after-fix.png` |
| Calendario profesor | `docs/screenshots/teacher-02-calendar.png` |
| Pacientes (admin) | `docs/screenshots/teacher-04-pacientes-ok.png` |
| Administración | `docs/screenshots/teacher-06-admin.png` |
| Mi Perfil profesor | `docs/screenshots/teacher-07-profile.png` |
| Mensajes (teacher) | `docs/screenshots/teacher-08-messages.png` |
| Panel alumno desktop | `docs/screenshots/student-01-panel.png` |
| Pagos alumno | `docs/screenshots/student-02-pagos.png` |
| Comprar / Renovar (pricing) | `docs/screenshots/student-03-pricing.png` |
| Calendario alumno | `docs/screenshots/student-05-calendario.png` |
| Mi Panel mobile | `docs/screenshots/student-06-mobile-panel.png` |

---

## 9. Decisiones de diseño (changelog)

### 2026-06-06
- **Heatmap día/hora reemplazado por gráfico de líneas** con filtro por día. Más legible en mobile.
- **Botón fantasma UserCircle wireado** → tab profile (teacher) / configuracion (student).
- **Topbar nav oculta en desktop** (`lg:hidden`). Sidebar es la nav principal en `lg+`.
- **Footer del Login unificado con el del Home** — usa `app_settings` de DB, no duplica copy.
- **AdminReports refactor**: ingresos mensuales (6 meses) en bar chart, planes por duración, métodos de pago con %, tendencia asistencia con filtro 7d/30d/90d/365d con granularidad adaptativa (diario/semanal/mensual).
- **Home aterrizado**: stats falsos (500+ atletas, 98% recuperación, 24/7) reemplazados por diferenciales reales (1:1, Tu deporte, Tu meta, L-V 7-22h). Copy "tecnología de última generación" sacado.
- **Sistema de asignación M2M alumno↔profesionales** (mig 023). Profesores no admin solo ven sus asignados.
- **Profesionales como segunda categoría de usuario** — `PatientsList` con prop `roleFilter` reutilizado. Tab "Profesionales" en AdminSection.
- **Security hardening (mig 021 + 022)**: 5 ERROR + 33 WARN del advisor → 0 + 8 (intencionales).
- **Pagos Mercado Pago + Khipu** integrados, Stripe deprecado (código queda).
- **Sistema de evaluaciones corporales + fuerza** (mig 019).
- **Onboarding wizard** corregido: ahora avanza correctamente tras guardar.

---

## 10. Pendientes de diseño

- 🎨 Replicar este sistema en Figma cuando el plan permita (requiere Pro o reset diario del rate limit del MCP).
- 🌓 Light mode futuro (hoy 100% dark).
- 🎯 Hero del home aún usa imagen Unsplash genérica — reemplazar por fotos reales del centro.
- 📐 Sin ilustraciones propias en empty states; hoy son lucide icons al 40px.
- 🎬 Motion: transiciones simples 150-200ms. Sin animaciones complejas. Considerar entrance animations en cards del dashboard.
- ♿ Accessibility: contraste verificado en darks; faltan labels ARIA en algunos charts; foco visible solo en CTAs primarios — extender a inputs y tabs.

---

*Para inspección visual interactiva del system mientras se arma Figma, los componentes están en vivo en cualquier URL del proyecto. El frontend usa Tailwind JIT, todo el styling vive en JSX.*

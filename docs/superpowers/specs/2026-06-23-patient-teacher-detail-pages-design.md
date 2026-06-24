# Migración de modal a página completa: detalle de alumno y profesor

**Fecha:** 2026-06-23
**Estado:** Aprobado para implementación

## Contexto

Hoy la edición/visualización de un alumno (`PatientDetailModal.tsx`) y de un profesor
(`TeacherDetailModal.tsx`) ocurre en modales superpuestos sobre `PatientsList.tsx`. Esto
fue una decisión deliberada que se dejó fuera de alcance en un trabajo anterior
("Migrar el formulario de creación/edición de modal a página completa con tabs — queda
como conversación de diseño aparte"). Ahora se retoma esa conversación.

Problema adicional, más urgente: dentro del modal de alumno, el tab "Datos" renderiza
`PatientForm.tsx`, que apila 13 secciones verticalmente sin ninguna sub-navegación —
scroll infinito dentro de un modal ya limitado en alto. Migrar a página completa por sí
solo no resuelve esto; se necesita además organizar esas 13 secciones en sub-tabs.

## Alcance

**Incluido:**
1. Página `/dashboard/patients/:id` reemplazando `PatientDetailModal.tsx` — mismos 6 tabs
   superiores (Datos, Notas, Asistencia, Evaluaciones, Profesionales, Pausar), reflejados
   en la URL vía query param `?tab=`.
2. Página `/dashboard/teachers/:id` reemplazando `TeacherDetailModal.tsx` — sin tabs
   superiores (el modal actual no los tiene), solo header + `TeacherProfileForm`.
3. Dentro del tab "Datos" de la página de alumno, las 13 secciones de `PatientForm.tsx`
   se agrupan en 4 sub-tabs (Perfil / Salud / Evaluación inicial / Administrativo) usando
   el componente Radix `Tabs` (`@/components/ui/tabs`), mismo patrón ya usado en
   `AdminPanel.tsx`.
4. `PatientsList.tsx` navega a estas rutas en vez de abrir los modales.
5. Aviso de cambios sin guardar al intentar salir del formulario o cambiar de tab
   superior estando en "Datos" con cambios sin guardar.

**Explícitamente fuera de alcance:**
- Reorganizar/agregar sub-tabs a `TeacherProfileForm.tsx` (sus 7 secciones son cortas,
  no presentan el problema de scroll infinito que sí tiene `PatientForm.tsx`).
- Aviso de cambios sin guardar al cerrar la pestaña del navegador o usar el botón atrás
  nativo (requiere un listener `beforeunload`/bloqueo de historial más invasivo; no se
  pidió y el modal actual tampoco lo tenía).
- Cualquier cambio al sub-proyecto C/D (plan de entrenamiento/alimentación) o al trabajo
  de recuperación de contraseña — no relacionado.

## Routing

Dos rutas nuevas en `client/App.tsx`, lazy-loaded igual que el resto de páginas pesadas.
`PatientsList.tsx` (de donde se navega a estas páginas) solo se monta dentro de
`TeacherDashboard`, protegido hoy con `requiredRole="teacher"` — para mantener la misma
postura de seguridad (un alumno no debería poder llegar tipeando la URL directamente),
las rutas nuevas usan el mismo `requiredRole="teacher"` (los admins ya tienen
`role: "teacher"` + `is_admin: true`, igual que en el resto de rutas de
`TeacherDashboard`):

```tsx
const PatientDetailPage = lazy(() => import("./pages/PatientDetailPage"));
const TeacherDetailPage = lazy(() => import("./pages/TeacherDetailPage"));
// ...
<Route path="/dashboard/patients/:id" element={
  <ProtectedRoute requiredRole="teacher"><Suspense fallback={<LoadingFallback />}><PatientDetailPage /></Suspense></ProtectedRoute>
} />
<Route path="/dashboard/teachers/:id" element={
  <ProtectedRoute requiredRole="teacher"><Suspense fallback={<LoadingFallback />}><TeacherDetailPage /></Suspense></ProtectedRoute>
} />
```

(El control fino de qué puede ver/editar un profesor no-admin dentro de la página —p.ej.
qué alumnos tiene asignados— ya lo hacen las funciones de `client/services/supabase.ts`
vía RLS, igual que hoy dentro del modal; esto solo evita que roles no-profesional entren.)

`PatientsList.tsx`: el botón "Ver / Editar" deja de hacer `setSelected(p)` y en su lugar
llama `navigate(isTeacherView ? `/dashboard/teachers/${p.id}` : `/dashboard/patients/${p.id}`)`.
Se elimina el estado `selected` y el render condicional de `PatientDetailModal`/
`TeacherDetailModal` (las dos importaciones también se eliminan).

El header de cada página nueva tiene un botón "← Volver" que llama `navigate(-1)`,
volviendo exactamente a `PatientsList` con sus filtros/scroll intactos (no se desmonta,
solo se navega a otra ruta y se vuelve atrás en el historial).

## `PatientDetailPage.tsx`

Contenido equivalente al `PatientDetailModal.tsx` actual, pero como página completa
(sin el wrapper `fixed inset-0 bg-black/70`):
- Header: botón "← Volver" + nombre del alumno + badge "Pausado" si corresponde.
- Banner de alertas críticas (mismo contenido y condición que hoy).
- Tabs superiores: Datos, Notas, Asistencia, Evaluaciones, Profesionales (solo admin),
  Pausar (solo admin) — mismos iconos y labels que hoy.
- El tab activo se lee/escribe vía `useSearchParams` (`?tab=notes`, `?tab=attendance`,
  etc., mismos valores de `Tab` que ya existen: `"form" | "notes" | "attendance" |
  "evaluations" | "professionals" | "pause"`), default `"form"` si no hay query param o
  el valor no es válido.
- `NotesPanel`, `AttendancePanel`, `PausePanel`, `ProfessionalsPanel`, `Stat` y las
  constantes `CRITICAL_KEYS`/`CRITICAL_LABELS` se mueven tal cual (sin cambios de lógica)
  a un archivo nuevo `client/components/dashboard/patient-detail/panels.tsx`, exportados
  individualmente. `PatientDetailPage.tsx` los importa desde ahí.
- El tab "Datos" renderiza `<PatientForm patientId={id} onSaved={refresh}
  onDirtyChange={setFormDirty} />` (sin `onCancel`, ya que no hay modal que cerrar —
  ver sección de aviso de cambios sin guardar más abajo para el manejo de
  `formDirty`).

## `TeacherDetailPage.tsx`

Mucho más simple — header ("← Volver" + nombre del profesional) + `<TeacherProfileForm
teacherId={id} onDirtyChange={setFormDirty} />`. Sin tabs superiores ni sub-tabs.

## Sub-tabs dentro de `PatientForm.tsx` (resolviendo el scroll infinito)

Las 13 secciones actuales se agrupan en 4 sub-tabs usando `Tabs`/`TabsList`/
`TabsTrigger`/`TabsContent` de `@/components/ui/tabs` (mismo componente que
`AdminPanel.tsx`), con `defaultValue="perfil"`:

| Sub-tab | Secciones que agrupa |
|---|---|
| **Perfil** | Foto del paciente, Datos personales, Contacto, Contacto de emergencia, Datos profesionales |
| **Salud** | PAR-Q, Datos médicos básicos, Enfermedades/condiciones, Medicamentos y sustancias, Deportes que practica |
| **Evaluación inicial** | Evaluación inicial (opcional) — sin cambios de contenido |
| **Administrativo** | Información adicional, Datos administrativos |

Es un único formulario: un solo botón "Guardar" (la barra sticky inferior que ya existe)
fuera/debajo de los sub-tabs, visible sin importar qué sub-tab esté activo. Los sub-tabs
son puramente de organización visual — no son pasos secuenciales, no validan ni guardan
de forma independiente, y cambiar de sub-tab nunca pierde datos ya tipeados en otro
(todas las secciones siguen siendo parte del mismo estado `form`/`evalForm` de React).

Como el cambio vive dentro de `PatientForm.tsx`, sus otros dos consumidores
(`OnboardingWizard.tsx` para alta de alumno nuevo, `StudentSettingsSection.tsx` para que
el alumno edite su propio perfil) heredan automáticamente la misma organización en
sub-tabs, sin requerir cambios en esos archivos.

## Aviso de cambios sin guardar

`PatientForm.tsx` y `TeacherProfileForm.tsx` reciben un nuevo prop opcional:

```ts
onDirtyChange?: (dirty: boolean) => void;
```

Cada uno guarda en un `ref` el snapshot del valor cargado al montar (o el valor vacío
inicial, si es alta nueva). En un `useEffect` que depende del estado del formulario
completo (`form` y, en el caso de `PatientForm`, también `evalForm`), calcula:

```ts
const dirty = JSON.stringify(form) !== JSON.stringify(savedSnapshotRef.current.form)
  || JSON.stringify(evalForm) !== JSON.stringify(savedSnapshotRef.current.evalForm);
```

y llama `onDirtyChange?.(dirty)` solo cuando el valor cambia respecto a la última
notificación (evitar renders innecesarios en el padre). Al completar un guardado
exitoso, se actualiza `savedSnapshotRef.current` al valor recién guardado y se llama
`onDirtyChange?.(false)` — para que el usuario pueda salir inmediatamente después de
guardar sin que el aviso se dispare en falso.

`PatientDetailPage.tsx` guarda `const [formDirty, setFormDirty] = useState(false)`,
pasado como `onDirtyChange={setFormDirty}` a `PatientForm`. Antes de:
- navegar con el botón "← Volver", o
- cambiar a otro tab superior (vía `setSearchParams`) mientras el tab activo es `"form"`,

se ejecuta:

```ts
if (formDirty && !confirm("Tienes cambios sin guardar. ¿Deseas salir de todas maneras?")) {
  return; // cancela la navegación/cambio de tab
}
```

(Mismo patrón `confirm()` nativo ya usado en `NotesPanel`/`PausePanel`/
`ProfessionalsPanel` de este mismo archivo hoy — no se introduce un componente de diálogo
nuevo.)

`TeacherDetailPage.tsx` aplica el mismo guard, pero solo sobre el botón "← Volver" (no
tiene tabs superiores que cambiar).

## Archivos a tocar

- **Crear:** `client/pages/PatientDetailPage.tsx`, `client/pages/TeacherDetailPage.tsx`,
  `client/components/dashboard/patient-detail/panels.tsx`
- **Modificar:** `client/components/dashboard/PatientForm.tsx` (sub-tabs Radix +
  `onDirtyChange`), `client/components/dashboard/TeacherProfileForm.tsx` (solo
  `onDirtyChange`, sin sub-tabs), `client/App.tsx` (2 rutas nuevas),
  `client/components/dashboard/PatientsList.tsx` (navegar en vez de abrir modal)
- **Eliminar:** `client/components/dashboard/PatientDetailModal.tsx`,
  `client/components/dashboard/TeacherDetailModal.tsx`

## Testing

Sin tests automatizados nuevos — es reorganización de UI existente (mover JSX entre
archivos, agregar sub-tabs visuales, agregar un callback de dirty-tracking) sin lógica de
negocio nueva que aísle en una función pura testeable. Se valida con verificación manual
en navegador: navegar a ambas páginas nuevas desde `PatientsList`, confirmar que los 6
tabs de alumno y las 4 sub-tabs de "Datos" funcionan y reflejan la URL correctamente,
confirmar que "← Volver" regresa a la lista, y confirmar que el aviso de cambios sin
guardar aparece al intentar salir/cambiar de tab con el formulario sucio y no aparece si
está limpio o recién guardado.

## Validación de cierre

Revisión manual en navegador cubriendo: alta de alumno nuevo (vía `OnboardingWizard`,
confirmando que también ve los sub-tabs), edición de alumno existente desde
`/dashboard/patients/:id` (los 6 tabs + las 4 sub-tabs de Datos + aviso de cambios sin
guardar), edición de profesor desde `/dashboard/teachers/:id`, y que `StudentSettingsSection`
(el alumno editando su propio perfil) sigue funcionando igual con los sub-tabs nuevos.

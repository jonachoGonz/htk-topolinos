# Reorganización de perfil de alumno + Evaluación mensual extendida

**Fecha:** 2026-06-20
**Estado:** Aprobado para implementación
**Sub-proyectos relacionados (fuera de alcance de este spec):** C (plan de entrenamiento), D (plan de alimentación)

## Contexto

El alumno hoy se registra en papel con `Formulario inscripción HTK.docx`. Ese documento
se va a eliminar — todo el alta de alumnos pasa a hacerse exclusivamente desde la app.

Se cruzaron los campos del formulario de papel con los campos actuales de creación/edición
de alumno (`PatientForm.tsx`, `PatientsList.tsx`) en un Google Sheet
([v2](https://docs.google.com/spreadsheets/d/1KaoFN2iGF35n9xzP05zBrBS6mAJfm-_i6kbyVOpN4vg/edit)),
agregando una columna "Acciones" que decide, campo por campo, si:
- se mantiene como dato estático del perfil,
- se mueve/agrega a una evaluación periódica (porque cambia con cada control profesional),
- o queda fuera de alcance (sub-proyectos C/D).

Durante la investigación se descubrió que la "evaluación mensual" que pedía el usuario
**ya existe parcialmente construida**: las tablas `body_evaluations` y
`strength_evaluations` (migración `019_evaluations.sql`) con UI en
`client/components/dashboard/EvaluationsPanel.tsx`, montada en
`PatientDetailModal.tsx`. Por lo tanto este trabajo es una **extensión**, no una
construcción desde cero.

También se detectó que varios campos de medición (peso, % grasa, cintura, etc.) están
**duplicados**: existen como snapshot estático en `profiles` (editado en `PatientForm.tsx`)
y, por separado, como historial en `body_evaluations` (editado en `EvaluationsPanel.tsx`).
Este spec elimina esa duplicación.

Verificado en la base real (proyecto Supabase `htkCenter`, `lvxktbecpvmbcuucjxpp`): solo
hay 3-4 perfiles de prueba y `body_evaluations`/`strength_evaluations` tienen 0 filas. No
hay riesgo de pérdida de datos reales al hacer los cambios.

## Alcance

**Incluido:**
1. Reorganizar campos estáticos de `profiles` (agregar 4, eliminar 13 duplicados).
2. Extender `body_evaluations` con los campos nuevos detectados en el formulario de papel.
3. Reorganizar `PatientForm.tsx` en los nuevos grupos.
4. Extender `EvaluationsPanel.tsx` con las nuevas sub-secciones.
5. Vista de progreso comparativo (mes vs. mes anterior) en `PatientDetailModal.tsx` y
   `StudentDashboardSection.tsx` — el "informe mensual" en su primera versión (vista en
   la app, sin exportación a PDF).

**Explícitamente fuera de alcance** (sub-proyectos futuros, se diseñan aparte):
- Plan de entrenamiento prescriptivo (ejercicios + cargas + reps + semana de
  carga/descarga + calentamiento + ejercicios kinesiológicos). No es una extensión de
  `strength_evaluations` — es un sistema nuevo independiente.
- Plan de alimentación diario/semanal. Hoy solo existe el flag
  `has_nutrition_tracking` en `plans`/`plan_templates`; no hay tabla de dieta real.
- Exportación de informe a PDF/documento descargable.

## Cambios en `profiles`

**Agregar:**
| Columna | Tipo | Notas |
|---|---|---|
| `socio_number` | text | N° de socio/membresía del formulario de papel |
| `social_media_handle` | text | @Usuario de redes sociales |
| `health_center` | text | Centro de salud específico al cual acudir (más específico que `insurer`) |
| `social_media_consent` | boolean | Consentimiento separado para ser etiquetado en redes sociales |

**Eliminar** (quedan exclusivamente en `body_evaluations`, ver abajo):
`height_cm`, `weight_kg`, `body_fat_pct`, `muscle_mass_pct`, `bone_mass_pct`,
`waist_cm`, `hip_cm`, `chest_cm`, `arm_cm`, `thigh_cm`, `calf_cm`, `activity_level`,
`objective`.

El "valor actual" de cualquiera de estos campos para un alumno pasa a leerse siempre
como el registro más reciente de `body_evaluations` (`ORDER BY measured_at DESC LIMIT 1`),
nunca desde `profiles`.

## Cambios en `body_evaluations`

**Columnas escalares nuevas:**
| Columna | Tipo |
|---|---|
| `height_cm` | numeric(5,2) |
| `bone_mass_pct` | numeric(4,1) |
| `neck_cm` | numeric(5,1) |
| `shoulders_cm` | numeric(5,1) |
| `resting_heart_rate` | integer |
| `blood_pressure_systolic` | integer |
| `blood_pressure_diastolic` | integer |

**Columnas JSONB nuevas** (mismo patrón que `parq_answers`/`diseases` en `profiles`):
| Columna | Forma |
|---|---|
| `skinfolds` | `{bicipital, tricipital, subescapular, abdominal, suprailiaco, thigh, leg}` (mm). La sumatoria NO se persiste como campo — se calcula en el cliente vía `computeSkinfoldSum()` cada vez que se necesita, para que nunca quede desincronizada si se edita un pliegue individual. |
| `habits` | `{smoking: {level, count}, alcohol: {level, count}, physical_activity: {level, count}, nutrition: {level}, hydration: {level}, rest: {level, hours}}` — `level` es uno de `no/a_veces/a_menudo/siempre` para hábitos de riesgo, o `malo/regular/bueno/excelente` para alimentación/hidratación/descanso |
| `max_hr_zones` | `{pct50, pct60, pct70, pct80, pct90, pct100}` (bpm) |
| `pain_assessment` | mnemónico ALICIA del formulario original: `{onset, location, radiation, character, intensity_0_10, aggravating}` |
| `objectives` | `{specific_1, specific_2, specific_3, general}` |

**Columnas de texto libre nuevas:** `rom_notes`, `strength_notes` (cualitativo — distinto
de la tabla numérica `strength_evaluations`), `findings`.

`activity_level` (que hoy vive en `profiles` con escala sedentario…atleta) se retira; su
reemplazo es `habits.physical_activity` con la escala del formulario de papel
(No/A veces/A menudo/Siempre + N° veces por semana).

## Cambios de UI

### `PatientForm.tsx`
Se eliminan las secciones "Composición corporal", "Mediciones (circunferencias)" y
"Actividad y objetivos" (sus campos pasan a `EvaluationsPanel.tsx`). Los grupos finales:

1. Datos personales (+ `socio_number`)
2. Contacto (+ `social_media_handle`)
3. Contacto de emergencia y salud (+ `health_center`)
4. Antecedentes médicos y quirúrgicos (incluye `sports`)
5. PAR-Q / Aptitud física
6. Consentimientos y administrativo (+ `social_media_consent`)

### `EvaluationsPanel.tsx`
El formulario de "Nueva medición" (sección `BodySection`) gana sub-secciones
colapsables: Antropometría (incluye cuello/hombros), Pliegues cutáneos, Signos vitales,
Hábitos, Evaluación del dolor, Objetivos. La tabla histórica mantiene sus columnas
actuales.

### Vista de progreso ("informe mensual" v1)
Nueva sub-sección en `PatientDetailModal.tsx` (tab evaluaciones) y en
`StudentDashboardSection.tsx`: compara la evaluación más reciente vs. la anterior
(deltas con flechas ↑↓), gráfico de línea de peso y % grasa en el tiempo, tabla de
objetivos vigentes. Se alimenta de `listBodyEvaluations`, sin tabla nueva.

## Migración y rollout

Una sola migración `024_profile_reorg_and_evaluations.sql`:
1. `ALTER TABLE profiles ADD COLUMN` (4 columnas nuevas).
2. `ALTER TABLE profiles DROP COLUMN` (13 columnas duplicadas/movidas).
3. `ALTER TABLE body_evaluations ADD COLUMN` (columnas de la tabla anterior).

Sin periodo de transición ni script de backfill: los datos de prueba actuales son
mínimos y no hay usuarios reales en producción todavía (verificado: `profiles` con
rol student = 4 filas, `body_evaluations` = 0 filas).

Después de la migración: actualizar tipos TS (`PatientProfile`, `BodyEvaluation`) en
`client/services/supabase.ts`, luego el código de UI.

## Validación de cierre

Al finalizar la implementación se ejecutará `/design-critique` sobre las pantallas
nuevas/modificadas (`PatientForm.tsx`, `EvaluationsPanel.tsx`, vista de progreso) y,
si la crítica encuentra problemas de usabilidad relevantes, se pasa por
`/frontend-design` para pulir antes de cerrar el trabajo.

## Addendum (2026-06-21) — feedback de revisión sobre el worktree

Tras levantar el worktree localmente, el usuario revisó la implementación y pidió los
siguientes ajustes. Se mantienen todas las decisiones de arquitectura anteriores (única
fuente de verdad en `body_evaluations` para datos que cambian mes a mes); estos cambios
son refinamientos, no un cambio de rumbo.

### Fixes de UI en `PatientForm.tsx`
- "Hijos": el checkbox "Sí" se corta de línea por ancho insuficiente — corregir layout.
  El input numérico de cantidad pasa a tener label propio "Número de hijos" (hoy no tiene
  label visible, solo aparece junto al checkbox).
- Quitar el campo "URL Foto (opcional)" de "Información adicional" — es redundante con
  `PhotoUploader`, que ya gestiona `photo_url`.
- `RepeatRows` (usado en Deportes, Medicamentos, Drogas): el botón de eliminar (X) debe
  quedar siempre en la misma fila que los campos en desktop. En mobile es aceptable que
  quede debajo. Fix: envolver los campos en su propio contenedor `flex-wrap` dentro de un
  flex-row externo `items-start` que NO hace wrap del botón X (`shrink-0`), así el X
  siempre queda anclado al inicio de la fila sin importar cuántas líneas ocupen los campos.

### Campos nuevos en `PatientForm.tsx`
- **Edad**: agregar como campo propio, de solo lectura (`disabled`), calculado desde
  `birth_date` vía `computeAge()` (ya existe). Reemplaza el sufijo "(X años)" que hoy va
  pegado al label de "Fecha de nacimiento".
- **Fecha de ingreso**: agregar input de fecha editable enlazado a `profiles.joined_at`
  (columna que ya existe, pero no estaba expuesta en el formulario). Default: fecha de hoy
  si el perfil no trae una.
- **Enfermedades / condiciones**: agregar opción "Otra" al final del grid de checkboxes.
  Al marcarla, aparece un campo de texto libre enlazado a la nueva columna
  `diseases_other`.
- **Contacto de emergencia**: pasa de 3 campos planos (nombre/teléfono/relación) a una
  lista de 1+ contactos (mismo patrón `RepeatRows` que Deportes), respaldada por la nueva
  columna `emergency_contacts` (jsonb array de `{name, phone, relation}`).
- **Dirección**: se separa en 3 campos — Dirección (calle), N° casa/depto, Comuna.
  `address` sigue siendo la calle; se agregan `address_number` y `comuna`.
- **N° de socio**: pasa de texto libre editable a autogenerado, de solo lectura pero
  copiable (botón de copiar al portapapeles). Se genera en el servidor
  (`admin-create-patient.ts`) al crear un alumno nuevo, formato `HTKTOP-001`,
  `HTKTOP-002`, ... vía una secuencia Postgres + función `next_socio_number()`. Los
  alumnos migrados del centro anterior usan el prefijo `HTK-` — esa reasignación de
  prefijo para casos puntuales se hace manualmente más adelante (fuera de la UI, fuera de
  alcance de este ítem).
- **Consentimiento de datos personales**: se reemplaza el checkbox genérico
  "Consentimiento informado / Firmado" por: un link a un documento externo (URL la
  entrega el usuario más adelante; se deja una constante `DATA_CONSENT_DOCUMENT_URL`
  placeholder fácil de reemplazar) + el checkbox con texto "Acepto el tratamiento de mis
  datos personales", alineado a la normativa de protección de datos personales.

### Evaluación inicial opcional (nuevo, en `PatientForm.tsx`)
El usuario quiere poder capturar hábitos/vitales/kinésica/composición corporal **en el
momento de crear/editar** al alumno, porque a veces el alta se hace a mitad de una
evaluación presencial — pero sin que sea obligatorio. Diseño:
- Nueva sección colapsable "Evaluación inicial (opcional)" en `PatientForm.tsx`, con
  exactamente los mismos campos que el formulario "Nueva evaluación" de
  `EvaluationsPanel.tsx` (antropometría, pliegues, vitales, hábitos, dolor, kinésica,
  objetivos).
- Para evitar duplicar ~300 líneas de JSX entre los dos formularios, se extrae a
  `client/components/dashboard/BodyEvaluationFields.tsx`: el estado vacío
  (`EMPTY_BODY_EVAL_FORM`), el componente de campos (`<BodyEvaluationFormFields
  form={form} onChange={setForm} />`), una función pura `buildBodyEvaluationPayload(form)`
  que aplica la misma lógica de "no persistir grupos vacíos" ya implementada, y los
  helpers `HabitField`/`TextField`/`Field`. `EvaluationsPanel.tsx` se refactoriza para
  consumir este módulo compartido (sin cambio de comportamiento).
- Si al guardar el perfil el profesional dejó algo lleno en esta sección (cualquier campo
  distinto del valor por defecto, sin contar la fecha), `PatientForm.tsx` también llama a
  `createBodyEvaluation` con `measured_at` = la fecha elegida en esa sección (default hoy)
  y `professional_id` = el usuario admin/profesor logueado — creando una fila real en el
  historial, nunca un campo estático nuevo en `profiles`.

### Migración 025 — datos
- `profiles`: agregar `address_number`, `comuna`, `emergency_contacts` (jsonb),
  `diseases_other` (text).
- `profiles`: migrar la única fila existente con `emergency_contact_name` no vacío
  (verificado en vivo: 1 de 6 perfiles) a `emergency_contacts` antes de eliminar las 3
  columnas viejas (`emergency_contact_name/phone/relation`).
- Nueva secuencia `socio_number_seq` + función `next_socio_number()` (`SECURITY` definer
  no necesario, función simple que envuelve `nextval`), usada por
  `admin-create-patient.ts` solo cuando `role = 'student'`.

### Fuera de alcance de este addendum
- Migrar el formulario de creación/edición de modal a página completa con tabs — queda
  como conversación de diseño aparte, después de cerrar estos fixes.
- Reasignar manualmente los prefijos `HTK-` vs `HTKTOP-` de alumnos específicos — lo
  resuelve el usuario directamente con Claude más adelante, no es trabajo de UI.

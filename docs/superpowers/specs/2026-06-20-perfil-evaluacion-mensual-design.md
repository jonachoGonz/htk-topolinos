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
| `skinfolds` | `{bicipital, tricipital, subescapular, abdominal, suprailiaco, thigh, leg, sum}` (mm; `sum` calculado client-side) |
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

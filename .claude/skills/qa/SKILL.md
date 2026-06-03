---
name: qa
description: |
  Ejecuta auditorías de QA sobre los flujos críticos de la plataforma HTK
  (login, planes, usuarios, bookings, pagos). Cada flujo es un checklist
  guiado: el skill propone los pasos, abre las rutas relevantes, y para cada
  paso registra ✓/✗ + evidencia (logs, network, errores). Termina con un
  reporte priorizado de fallas, distinguiendo bugs de código vs problemas
  de datos/RLS en Supabase.

  Trigger when: el usuario pide "QA", "auditar flujos", "verificar CRUD",
  "certificar que funciona X", "probar end-to-end", o reporta un bug y
  quiere validar que no hay otros relacionados.
---

# /qa — Quality Assurance guiado para HTK Center

## Cómo funciona

Sin argumentos, lista los checklists disponibles y te pregunta cuál ejecutar.
Con un nombre de flujo (`/qa planes`, `/qa login`, `/qa booking`), arranca
ese checklist directamente.

```
/qa                     → menú
/qa login               → flujo Login
/qa planes              → flujo CRUD de planes
/qa usuarios            → flujo CRUD de usuarios/perfiles
/qa booking             → flujo de disponibilidad y reservas
/qa all                 → corre los 4 flujos en orden
```

## Reglas de ejecución (obligatorias)

1. **Un paso a la vez.** Para cada paso del checklist:
   - Lee el código relevante (servicio, componente, migración)
   - Identifica el supuesto que el paso valida
   - Cuando hay verificación en browser, pide al usuario que reporte
     resultado o usa `mcp__Claude_Preview__*` si está disponible
   - Registra resultado: ✓ / ✗ / ⚠ (warning) + 1 línea de evidencia

2. **Diferencia bug de código vs RLS/datos.**
   - Si Supabase devuelve error con texto `policy`, `row.?level`,
     `permission`, `denied` → es RLS, no bug de código
   - Si el código no chequea `success` antes de seguir → es bug
   - Si la respuesta es exitosa pero el UI no refleja → es bug de estado
   - Si una columna no existe → es desincronización schema/migration

3. **No corras el dev server tú.** El usuario lo tiene levantado (o
   Netlify). Pide URL si la necesitas. Para tests headless usa
   `mcp__Claude_Preview__preview_start` si está habilitado.

4. **Reporte final.** Al terminar un flujo entrega:
   - Tabla resumen: pasos ✓/✗/⚠ por sección
   - Lista priorizada de fallas: P0 (bloqueante) / P1 (degrada UX) / P2 (mejora)
   - Próximo paso concreto por cada P0/P1 (path del archivo + línea aproximada)

## Checklists disponibles

### 1. `login` — Autenticación + redirect

**Setup:** usuario de prueba (alumno) y otro (profesor/admin) creados en Supabase.

```
[ ] L1. /login carga sin errores (200, sin console.error)
[ ] L2. Tab "Alumno" / "Profesional" cambia el form sin perder valores
[ ] L3. Submit con credenciales vacías → botón deshabilitado
[ ] L4. Submit con credenciales incorrectas → toast/inline error claro,
        sin redirect, sin loop de loading
[ ] L5. Submit con credenciales válidas de alumno desde tab Alumno
        → toast success, redirect a /dashboard/student en <2s
[ ] L6. Submit con credenciales de profesor desde tab Alumno
        → error explícito "Esta cuenta es de profesional…", no redirect
[ ] L7. Submit con credenciales válidas de profesor desde tab Profesional
        → toast success, redirect a /dashboard
[ ] L8. Sesión persistida: refresh /dashboard sin logout
        → muestra dashboard (no rebota a /login)
[ ] L9. Click "Cerrar sesión" en sidebar → /login, sesión limpia
[ ] L10. Volver a /dashboard sin sesión → redirect a /login
[ ] L11. Cuenta sin perfil en `profiles` table
         → error explícito "No encontramos tu perfil"
```

**Archivos:** `client/pages/Login.tsx`, `client/contexts/AuthContext.tsx`,
`client/components/ProtectedRoute.tsx`, `client/services/supabase.ts` (loginTeacher/loginStudent).

### 2. `planes` — CRUD de plan_templates

**Setup:** sesión activa como `is_admin = TRUE`.

```
[ ] P1. Admin → tab Planes lista todos los planes (active e inactive si toggle)
[ ] P2. Si el usuario NO es admin, banner amarillo "Modo solo-lectura"
        aparece antes de la tabla
[ ] P3. Crear plan: form vacío valida nombre requerido y monthly_classes >= 0
[ ] P4. Crear plan completo: nombre, clases/mes, precios, renovaciones
        → toast "Plan creado", fila aparece en tabla
[ ] P5. Verificar en Supabase: row en plan_templates con monthly_classes,
        sessions_per_month (mirror), prices.monthly y price_per_month iguales
[ ] P6. Editar plan: cambiar precio mensual + clases/mes → guardar
        → toast "Plan actualizado", fila refleja cambios
[ ] P7. Editar plan con cuenta no-admin → toast P0 con mensaje RLS
        "Sin permisos para guardar (RLS)..."
[ ] P8. Toggle show_on_landing → afecta landing pública (Pricing.tsx
        usa getPublicPlans que filtra is_active && show_on_landing)
[ ] P9. Reordenar (display_order arriba/abajo) → swap funciona,
        landing refleja orden
[ ] P10. Eliminar plan → confirm dialog → soft-delete (is_active=false),
         sigue existiendo en DB pero no en landing
[ ] P11. Marcar como default → único default a la vez (constraint
         uq_plan_templates_one_default)
[ ] P12. accepts_discount_codes = true sin código → validación bloquea
[ ] P13. includes_sessions = true requiere session_type y count >= 1
[ ] P14. Landing (/) muestra solo planes is_active && show_on_landing,
         ordenados por display_order asc
```

**Archivos:** `client/components/admin/AdminPlansManager.tsx`,
`client/services/supabase.ts` (createPlanTemplate, updatePlanTemplate,
deletePlanTemplate, setDefaultPlanTemplate, getPublicPlans),
`migrations/001_create_payment_tables.sql`, `migrations/004_plans_admin_enhancements.sql`,
`migrations/016_landing_data_and_plans.sql`.

**Tabla:** `plan_templates`. **RLS:** "Admin can manage all plan_templates"
(requires `is_user_admin()` SQL function returning true).

### 3. `usuarios` — Profiles + roles

**Setup:** admin activo, al menos 1 student y 1 teacher en DB.

```
[ ] U1. Sidebar > Alumnos lista alumnos activos
[ ] U2. Crear alumno (PatientForm): nombre + email + role=student
        → row en profiles con auto-trigger 011_auto_profile_on_signup
[ ] U3. Editar perfil propio (Mi Perfil tab) → cambios se guardan,
        nombre actualizado refleja en sidebar tras reload
[ ] U4. Pausar alumno (is_paused=true) → no aparece en lista activa
[ ] U5. Asignar plan a alumno → row en student_plan_assignments
[ ] U6. Cambiar rol de alumno a admin (solo admin puede) → is_admin=true
        permite acceder a tab Administración
[ ] U7. Cuenta sin profile row → login muestra error claro
        (test del fix L11)
[ ] U8. Profile.avatar_url upload → file llega a Supabase Storage,
        url se guarda en profiles.avatar_url
[ ] U9. Eliminar alumno → soft-delete (is_active=false) o hard-delete
        según política; verificar bookings asociados no quedan huérfanos
```

**Archivos:** `client/components/dashboard/PatientForm.tsx`, `PatientsList.tsx`,
`PatientDetailModal.tsx`, `PhotoUploader.tsx`, `client/services/supabase.ts`
(getStudents, updateProfile, etc), migrations 005, 007, 009, 011.

**Tabla:** `profiles`. **RLS:** depende de role; admin lee todas, teacher
lee asignadas, student lee la propia.

### 4. `booking` — Disponibilidad + reservas

**Setup:** profesor con disponibilidad configurada; alumno con plan activo.

```
[ ] B1. Profesor: tab Calendario carga su grilla semanal
[ ] B2. Crear disponibilidad (AvailabilityManager): día + hora inicio/fin
        + capacidad → row en availability table
[ ] B3. Bulk create (BulkAvailabilityForm): rango fechas + días + horas
        → N rows insertados, no duplicados
[ ] B4. Editar slot existente (EditAvailabilityModal): cambiar capacidad
        o hora → row updated_at refleja
[ ] B5. Eliminar slot vacío → row borrado o is_active=false
[ ] B6. Eliminar slot CON bookings → bloqueado o cascade con warning
[ ] B7. Holidays (HolidayManager): crear feriado → slots de ese día
        se excluyen del booking público
[ ] B8. Alumno: BookingCalendar muestra slots disponibles del profesor
        (capacity > current_bookings, sin holiday, futuro)
[ ] B9. Alumno reserva slot: row en bookings con student_id,
        availability_id, status='confirmed'
[ ] B10. Slot lleno → BookingSlotCard se deshabilita
[ ] B11. Alumno cancela booking < 24h antes → política valida
[ ] B12. Profesor marca asistencia (upsertAttendance): row en attendance
[ ] B13. Recurring bookings: createBookings con repeatWeeks=4 →
         crea 4 rows, +7d cada una, sin solapamiento
```

**Archivos:** `client/components/dashboard/AvailabilityManager.tsx`,
`BulkAvailabilityForm.tsx`, `HolidayManager.tsx`, `EditAvailabilityModal.tsx`,
`client/components/htk/BookingCalendar.tsx`, `BookingSlotCard.tsx`,
`client/services/supabase.ts` (createBookings, upsertAttendance,
getAvailability, etc).

**Tablas:** `availability`, `bookings`, `attendance`, `holidays`.

## Notas operativas

- **Acceso a Supabase:** este skill NO consulta Supabase directamente.
  Solicita al usuario que pegue resultados de queries cuando hace falta
  evidencia de DB (ej: `SELECT id, name, is_active, show_on_landing FROM plan_templates ORDER BY display_order`).
- **Network tab:** para validar request/response, pide al usuario abrir
  DevTools > Network y filtrar por `supabase.co` durante el paso.
- **Errores silenciosos:** si el toast no aparece pero la acción no funciona,
  revisa `console.error` — el código suele hacer log antes del toast.
- **No ejecutes destructivos sin confirmar:** delete de planes/usuarios/
  bookings requiere confirmación explícita del usuario antes del paso.

## Plantilla de reporte

Al cerrar un flujo:

```
# QA <flujo> — <fecha>

## Resumen
✓ N pasos OK · ✗ M fallos · ⚠ K warnings

## Fallas P0 (bloqueante)
- [archivo:línea] descripción + paso para reproducir + fix sugerido

## Fallas P1 (degrada UX)
- ...

## Notas P2 (mejoras)
- ...

## Siguiente acción
<comando concreto: ej "ejecutar /qa planes después de aplicar migration 017">
```

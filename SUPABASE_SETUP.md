# Guía de Setup Supabase para Phase 4 - Pagos

## Paso 1: Copiar el Script SQL

El script de migración está en: `migrations/001_create_payment_tables.sql`

## Paso 2: Ejecutar en Supabase SQL Editor

1. Abre **Supabase Dashboard** → https://app.supabase.com
2. Selecciona tu proyecto: `htk-topolinos`
3. Ve a **SQL Editor** en el menú lateral
4. Click en **+ New Query**
5. Copia todo el contenido de `migrations/001_create_payment_tables.sql`
6. Pega en el SQL editor
7. Click **Run** (Ctrl+Enter)

## Esperado

El script debería completarse sin errores y crear:
- 5 tablas: `plan_templates`, `plan_durations`, `promo_codes`, `payments`, `subscriptions`
- Índices para optimización
- RLS policies para seguridad
- Triggers para auto-actualizar timestamps

## Verificación

Después de ejecutar, verifica en **Table Editor**:
1. ✅ Tabla `plan_templates` existe con columnas correctas
2. ✅ Tabla `plan_durations` existe
3. ✅ Tabla `promo_codes` existe
4. ✅ Tabla `payments` existe
5. ✅ Tabla `subscriptions` existe

## Próximo Paso

Después de crear las tablas, implementaremos:
- `/server/services/PaymentProvider.ts` (interfaz abstracta)
- `/server/services/StripeProvider.ts` (implementación Stripe)
- `/server/routes/payment.ts` (rutas de pago)

---

## Troubleshooting

**Error: "table "plan_templates" already exists"**
- El script intenta crear si no existe (`IF NOT EXISTS`)
- Si dice que ya existe, corre en una transacción: `BEGIN; ... ROLLBACK;` y verifica que no hay conflictos

**Error: "column "role" does not exist in table "profiles"**
- Asegúrate que la tabla `profiles` tenga columna `role` (debería existir del Phase 1)
- Si no existe: `ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'student';`

**Error en RLS policies**
- Verifica que existe `public.profiles` table
- Las policies usan JOIN a profiles para verificar rol del usuario
- Si hay error, comenta las RLS policies por ahora y las revisamos después

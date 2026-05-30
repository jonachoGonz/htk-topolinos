# Verificación Manual de Tablas Supabase - Phase 4

## ✅ Paso 1: Verificar Tablas en Supabase Dashboard

1. Abre: https://app.supabase.com
2. Selecciona proyecto: `htk-topolinos`
3. En el menú izquierdo, ve a **Table Editor**
4. En la lista de tablas, deberías ver estas 5 nuevas tablas:
   - ✅ `plan_templates`
   - ✅ `plan_durations`
   - ✅ `promo_codes`
   - ✅ `payments`
   - ✅ `subscriptions`

Si ves todas 5 tablas → **ÉXITO ✨**

Si falta alguna → Ve al **SQL Editor** y revisa los logs de error

---

## ✅ Paso 2: Verificar Estructura de Tablas

Haz click en cada tabla para ver sus columnas:

### plan_templates
Debe tener columnas:
- id (UUID)
- professional_id (UUID)
- name (TEXT)
- description (TEXT)
- sessions_per_month (INTEGER)
- price_per_month (BIGINT)
- currency (TEXT)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### plan_durations
Debe tener columnas:
- id (UUID)
- plan_template_id (UUID)
- duration_months (INTEGER)
- discount_percent (INTEGER)
- created_at (TIMESTAMP)

### promo_codes
Debe tener columnas:
- id (UUID)
- code (TEXT)
- discount_percent (INTEGER)
- valid_from (DATE)
- valid_until (DATE)
- max_uses (INTEGER)
- used_count (INTEGER)
- applicable_plans (UUID[])
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### payments
Debe tener columnas:
- id (UUID)
- student_id (UUID)
- plan_template_id (UUID)
- duration_months (INTEGER)
- promo_code_id (UUID)
- amount (BIGINT)
- currency (TEXT)
- provider (TEXT)
- provider_transaction_id (TEXT)
- status (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

### subscriptions
Debe tener columnas:
- id (UUID)
- student_id (UUID)
- plan_template_id (UUID)
- payment_id (UUID)
- sessions_total (INTEGER)
- sessions_used (INTEGER)
- start_date (DATE)
- end_date (DATE)
- is_active (BOOLEAN)
- auto_renew (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

---

## ✅ Paso 3: Verificar RLS (Row Level Security)

En el **SQL Editor** de Supabase, ejecuta:

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('plan_templates', 'plan_durations', 'promo_codes', 'payments', 'subscriptions')
ORDER BY tablename;
```

Deberías ver que `rowsecurity` es `true` para todas las tablas ✅

---

## ✅ Paso 4: Verificar Índices

En el **SQL Editor**, ejecuta:

```sql
SELECT 
  tablename,
  indexname
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN ('plan_templates', 'plan_durations', 'promo_codes', 'payments', 'subscriptions')
ORDER BY tablename, indexname;
```

Deberías ver múltiples índices (idx_*) para cada tabla ✅

---

## ✅ Paso 5: Probar Inserción de Datos

En el **SQL Editor**, intenta esto:

```sql
-- Test: Crear un plan_template de prueba
INSERT INTO plan_templates (
  professional_id,
  name,
  description,
  sessions_per_month,
  price_per_month,
  currency,
  is_active
) VALUES (
  auth.uid(),
  'Test Plan',
  'Un plan de prueba',
  4,
  7500000,
  'CLP',
  true
);
```

Si funciona → **¡Sistema de pagos listo para desarrollo!** ✨

---

## Resultado Final

Si completaste todos los pasos exitosamente:

✅ Todas 5 tablas existen
✅ Columnas correctas en cada tabla
✅ RLS habilitado
✅ Índices creados
✅ Datos se pueden insertar

**Estado: LISTO PARA FASE 4.2 (Backend)**

---

## Si algo salió mal

1. **Tabla no existe**: Ve a SQL Editor y ejecuta nuevamente `migrations/001_create_payment_tables.sql`
2. **Error "Table already exists"**: Significa que se creó parcialmente. Dropea la tabla y recrea:
   ```sql
   DROP TABLE IF EXISTS plan_templates CASCADE;
   ```
3. **RLS no habilitado**: Las políticas no se aplicaron. Revisa los logs en SQL Editor

Contáctame si hay problemas específicos.

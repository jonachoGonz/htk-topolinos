/**
 * Script de verificación de tablas de Phase 4
 * Verifica que las 5 nuevas tablas de pagos fueron creadas correctamente
 *
 * Uso: npx ts-node verify_schema.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://lvxktbecpvmbcuucjxpp.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_d-grONMFyOeNFzmD0nf-7g_uk9vgR8v";

const supabase = createClient(supabaseUrl, supabaseKey);

interface TableInfo {
  name: string;
  expectedColumns: string[];
}

const expectedTables: TableInfo[] = [
  {
    name: "plan_templates",
    expectedColumns: ["id", "professional_id", "name", "sessions_per_month", "price_per_month", "currency", "is_active", "created_at", "updated_at"],
  },
  {
    name: "plan_durations",
    expectedColumns: ["id", "plan_template_id", "duration_months", "discount_percent", "created_at"],
  },
  {
    name: "promo_codes",
    expectedColumns: ["id", "code", "discount_percent", "valid_from", "valid_until", "max_uses", "used_count", "applicable_plans", "created_at", "updated_at"],
  },
  {
    name: "payments",
    expectedColumns: ["id", "student_id", "plan_template_id", "duration_months", "promo_code_id", "amount", "currency", "provider", "provider_transaction_id", "status", "created_at", "updated_at"],
  },
  {
    name: "subscriptions",
    expectedColumns: ["id", "student_id", "plan_template_id", "payment_id", "sessions_total", "sessions_used", "start_date", "end_date", "is_active", "auto_renew", "created_at", "updated_at"],
  },
];

async function verifyTable(table: TableInfo): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(table.name)
      .select("*")
      .limit(0);

    if (error) {
      console.error(`❌ ${table.name}: NO EXISTE - ${error.message}`);
      return false;
    }

    console.log(`✅ ${table.name}: EXISTE`);
    return true;
  } catch (error) {
    console.error(`❌ ${table.name}: ERROR - ${String(error)}`);
    return false;
  }
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║              VERIFICACIÓN DE TABLAS PHASE 4 - SUPABASE                      ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝\n");

  console.log(`📍 Supabase URL: ${supabaseUrl}\n`);
  console.log("Verificando tablas...\n");

  let successCount = 0;
  const results: boolean[] = [];

  for (const table of expectedTables) {
    const exists = await verifyTable(table);
    results.push(exists);
    if (exists) successCount++;
  }

  console.log("\n" + "=".repeat(80));
  console.log(`\n📊 RESULTADO: ${successCount}/${expectedTables.length} tablas creadas exitosamente\n`);

  if (successCount === expectedTables.length) {
    console.log("✨ ¡ÉXITO! Todas las tablas fueron creadas correctamente.\n");
    console.log("Próximos pasos:");
    console.log("  1. Implementar PaymentProvider (interfaz abstracta)");
    console.log("  2. Implementar StripeProvider");
    console.log("  3. Crear rutas Express para pagos");
    console.log("  4. Crear Admin Panel para gestión de planes\n");
    process.exit(0);
  } else {
    console.log("⚠️  AVISO: Algunas tablas no se crearon correctamente.\n");
    console.log("Tablas faltantes:");
    expectedTables.forEach((table, idx) => {
      if (!results[idx]) {
        console.log(`  - ${table.name}`);
      }
    });
    console.log("\nAcciones a tomar:");
    console.log("  1. Verifica el script SQL en Supabase Dashboard");
    console.log("  2. Revisa los logs de error en SQL Editor");
    console.log("  3. Intenta ejecutar el script nuevamente\n");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ Error fatal:", error);
  process.exit(1);
});

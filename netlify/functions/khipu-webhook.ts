/**
 * Khipu — Webhook (notify_url)
 *
 * POST /.netlify/functions/khipu-webhook
 *
 * Khipu envía form-urlencoded con:
 *   api_version=3.0&notification_token=<token>
 *
 * Verificamos consultando la API:
 *   GET https://payment-api.khipu.com/v3/payments?notification_token=<token>
 * con x-api-key. Esto devuelve el payment completo y autenticado.
 *
 * Mapeo de status:
 *   "done"       → succeeded  (pago confirmado, activamos plan)
 *   "verifying"  → pending    (Khipu aún está confirmando con el banco)
 *   "pending"    → pending
 *   "claimed"    → failed     (alumno reclamó / rechazó)
 *   default      → pending
 *
 * Idempotencia: si ya está succeeded, NO reasignamos plan.
 */

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "ok" };
  }

  const rawUrl = process.env.SUPABASE_URL?.trim() || "";
  const supabaseUrl = rawUrl
    .replace(/\/+$/, "")
    .replace(/\/(rest|auth|storage|realtime)\/v\d+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  const khipuKey = process.env.KHIPU_API_KEY?.trim() || "";

  if (!supabaseUrl || !serviceRoleKey || !khipuKey) {
    console.error("khipu-webhook: missing env vars");
    return { statusCode: 500, body: JSON.stringify({ error: "missing config" }) };
  }

  try {
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // 1. Extraer notification_token (Khipu envía form-urlencoded)
    let notificationToken: string | null = null;
    const ctype = (event.headers["content-type"] || event.headers["Content-Type"] || "").toLowerCase();
    if (ctype.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(event.body || "");
      notificationToken = params.get("notification_token");
    } else {
      try {
        const body = JSON.parse(event.body || "{}");
        notificationToken = body.notification_token || null;
      } catch { /* ignore */ }
    }
    if (!notificationToken) {
      const qs = event.queryStringParameters || {};
      notificationToken = qs.notification_token || null;
    }

    if (!notificationToken) {
      console.warn("khipu-webhook: no notification_token", event.body);
      return { statusCode: 200, body: "no token" };
    }

    // 2. Consultar el pago real en Khipu
    const khRes = await fetch(
      `https://payment-api.khipu.com/v3/payments?notification_token=${encodeURIComponent(notificationToken)}`,
      { headers: { "x-api-key": khipuKey } },
    );
    if (!khRes.ok) {
      const text = await khRes.text().catch(() => "");
      console.error("khipu-webhook: Khipu lookup failed", khRes.status, text);
      return { statusCode: 200, body: "lookup failed" };
    }
    const khPayment: any = await khRes.json();
    const internalPaymentId = khPayment.transaction_id; // = nuestro payments.id
    const khStatus = khPayment.status;
    const khPaymentId = khPayment.payment_id;

    if (!internalPaymentId) {
      console.warn("khipu-webhook: no transaction_id in payment", khPaymentId);
      return { statusCode: 200, body: "no internal ref" };
    }

    // 3. Buscar payment interno
    const { data: payment, error: pErr } = await sb
      .from("payments")
      .select("id, student_id, plan_template_id, duration_months, status")
      .eq("id", internalPaymentId)
      .single();
    if (pErr || !payment) {
      console.error("khipu-webhook: payment not found", internalPaymentId, pErr?.message);
      return { statusCode: 200, body: "not found" };
    }

    // 4. Mapear status
    const newStatus =
      khStatus === "done" ? "succeeded" :
      khStatus === "claimed" ? "failed" :
      "pending";

    const alreadySucceeded = payment.status === "succeeded";

    await sb
      .from("payments")
      .update({
        status: newStatus,
        provider_transaction_id: `khipu:${khPaymentId}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    // 5. Si confirmado por primera vez → asignar plan
    if (newStatus === "succeeded" && !alreadySucceeded) {
      const { data: tpl } = await sb
        .from("plan_templates")
        .select("name, monthly_classes, has_nutrition_tracking")
        .eq("id", payment.plan_template_id)
        .single();

      if (tpl) {
        const months = payment.duration_months;
        const { error: rpcErr } = await sb.rpc("admin_assign_plan_to_student", {
          p_student_id: payment.student_id,
          p_plan_template_id: payment.plan_template_id,
          p_duration_months: months,
        });

        if (rpcErr) {
          await sb
            .from("plans")
            .update({ is_active: false })
            .eq("student_id", payment.student_id)
            .eq("is_active", true);

          const totalSessions = tpl.monthly_classes * months;
          const expiry = new Date();
          expiry.setMonth(expiry.getMonth() + months);

          await sb.from("plans").insert({
            student_id: payment.student_id,
            name: tpl.name,
            total_sessions: totalSessions,
            remaining_sessions: totalSessions,
            monthly_class_count: tpl.monthly_classes,
            expiry_date: expiry.toISOString().split("T")[0],
            is_active: true,
            has_nutrition_tracking: !!tpl.has_nutrition_tracking,
          });
        } else if (tpl.has_nutrition_tracking) {
          await sb
            .from("plans")
            .update({ has_nutrition_tracking: true })
            .eq("student_id", payment.student_id)
            .eq("is_active", true);
        }

        await sb.from("notifications").insert({
          user_id: payment.student_id,
          type: "plan_purchased",
          title: "Pago confirmado",
          message: `Tu plan "${tpl.name}" está activo por ${months} ${months === 1 ? "mes" : "meses"}`,
          link_url: "/dashboard/student",
        }).select();
      }
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, status: newStatus }) };
  } catch (err: any) {
    console.error("khipu-webhook error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

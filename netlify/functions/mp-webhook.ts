/**
 * Mercado Pago — Webhook (notification_url)
 *
 * POST /.netlify/functions/mp-webhook
 *
 * MP notifica con dos formatos:
 *   - Body JSON: { action, data: { id }, type }
 *   - Query string: ?type=payment&data.id=PAYMENT_ID
 *
 * Flujo:
 *   1. Extrae el payment_id de la notificación
 *   2. GET https://api.mercadopago.com/v1/payments/{id} con MP_ACCESS_TOKEN
 *   3. Usa external_reference para encontrar nuestro payment.id
 *   4. Update status del payment según status MP (approved/rejected/pending)
 *   5. Si approved → asigna plan al alumno (activa plan, descuenta crédito)
 *
 * Env:
 *   MP_ACCESS_TOKEN
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Nota: MP a veces reenvía la misma notificación. La lógica es idempotente
 * porque el UPDATE de payments + el upsert de plans no duplican.
 */

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    // MP a veces hace GET para verificar el endpoint — respondemos 200
    return { statusCode: 200, body: "ok" };
  }

  const rawUrl = process.env.SUPABASE_URL?.trim() || "";
  const supabaseUrl = rawUrl
    .replace(/\/+$/, "")
    .replace(/\/(rest|auth|storage|realtime)\/v\d+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  const mpToken = process.env.MP_ACCESS_TOKEN?.trim() || "";

  if (!supabaseUrl || !serviceRoleKey || !mpToken) {
    console.error("mp-webhook: missing env vars");
    return { statusCode: 500, body: JSON.stringify({ error: "missing config" }) };
  }

  try {
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // 1. Extraer payment_id de body o query
    let mpPaymentId: string | null = null;
    let topic: string | null = null;

    try {
      const body = JSON.parse(event.body || "{}");
      topic = body.type || body.topic || null;
      mpPaymentId = body.data?.id ? String(body.data.id) : null;
    } catch {
      /* body no JSON, intenta query */
    }

    if (!mpPaymentId) {
      const qs = event.queryStringParameters || {};
      topic = topic || qs.type || qs.topic || null;
      mpPaymentId = qs["data.id"] || qs.id || null;
    }

    // Ignoramos notificaciones que no sean de pago
    if (topic && !["payment", "merchant_order"].includes(topic)) {
      console.log("mp-webhook: ignoring topic", topic);
      return { statusCode: 200, body: "ignored" };
    }
    if (!mpPaymentId) {
      console.warn("mp-webhook: no payment_id in notification", event.body, event.queryStringParameters);
      return { statusCode: 200, body: "no payment id" };
    }

    // 2. Consultar el pago real en MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    if (!mpRes.ok) {
      const text = await mpRes.text().catch(() => "");
      console.error("mp-webhook: MP get-payment failed", mpRes.status, text);
      return { statusCode: 200, body: "mp lookup failed" };
    }
    const mpPayment: any = await mpRes.json();
    const externalRef = mpPayment.external_reference; // = nuestro payment.id
    const mpStatus = mpPayment.status; // approved | rejected | pending | in_process | ...

    if (!externalRef) {
      console.warn("mp-webhook: no external_reference, skipping", mpPaymentId);
      return { statusCode: 200, body: "no ref" };
    }

    // 3. Buscar nuestro payment
    const { data: payment, error: pErr } = await sb
      .from("payments")
      .select("id, student_id, plan_template_id, duration_months, status")
      .eq("id", externalRef)
      .single();
    if (pErr || !payment) {
      console.error("mp-webhook: payment not found", externalRef, pErr?.message);
      return { statusCode: 200, body: "not found" };
    }

    // 4. Mapear status MP → status interno
    const newStatus =
      mpStatus === "approved" ? "succeeded" :
      mpStatus === "rejected" || mpStatus === "cancelled" ? "failed" :
      "pending";

    // Idempotencia: si ya está succeeded, no reasignamos plan
    const alreadySucceeded = payment.status === "succeeded";

    await sb
      .from("payments")
      .update({
        status: newStatus,
        provider_transaction_id: String(mpPaymentId),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    // 5. Si approved → asignar plan al alumno
    if (newStatus === "succeeded" && !alreadySucceeded) {
      // Intentar RPC primero (mismo flujo que assignPlanToStudent del cliente)
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
          // Fallback client-side equivalente
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
          // RPC OK → estampar flag nutri en el plan recién creado
          await sb
            .from("plans")
            .update({ has_nutrition_tracking: true })
            .eq("student_id", payment.student_id)
            .eq("is_active", true);
        }

        // Notificación al alumno
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
    console.error("mp-webhook error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

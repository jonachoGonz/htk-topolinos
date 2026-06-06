/**
 * Khipu — Crear pago (Cuenta Khipu de cobro / API v3)
 *
 * POST /.netlify/functions/khipu-create
 * Auth: Bearer <user_access_token>  (debe ser el alumno que paga)
 * Body: { planTemplateId, period, discountCode? }
 *
 * Devuelve: { payment_url, payment_id, internal_payment_id }
 *
 * Env requeridas:
 *   KHIPU_API_KEY                (x-api-key de Khipu API v3, cuenta de cobro)
 *   SUPABASE_URL                 (sin trailing slash)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   URL                          (URL pública del sitio)
 *
 * Notas:
 * - Khipu solo opera en CLP.
 * - El alumno es redirigido a payment_url; al confirmarse el pago, Khipu
 *   llama a notify_url (khipu-webhook).
 */

import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const PERIOD_TO_MONTHS: Record<string, number> = {
  monthly: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const rawUrl = process.env.SUPABASE_URL?.trim() || "";
  const supabaseUrl = rawUrl
    .replace(/\/+$/, "")
    .replace(/\/(rest|auth|storage|realtime)\/v\d+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  const khipuKey = process.env.KHIPU_API_KEY?.trim() || "";
  const siteUrl =
    process.env.URL?.trim() || process.env.DEPLOY_URL?.trim() || "http://localhost:8080";

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
    };
  }
  if (!khipuKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing KHIPU_API_KEY — agrega la credencial de Khipu en Netlify env vars" }),
    };
  }

  try {
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // 1. Auth del caller
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return { statusCode: 401, body: JSON.stringify({ error: "Missing Authorization header" }) };
    }
    const token = authHeader.slice("Bearer ".length);
    const { data: callerData, error: callerErr } = await sb.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid token" }) };
    }
    const studentId = callerData.user.id;
    const studentEmail = callerData.user.email || "";

    // 2. Parse body
    const body = JSON.parse(event.body || "{}");
    const { planTemplateId, period = "monthly", discountCode = null } = body;
    const months = PERIOD_TO_MONTHS[period] ?? 1;
    if (!planTemplateId) {
      return { statusCode: 400, body: JSON.stringify({ error: "planTemplateId requerido" }) };
    }

    // 3. Template
    const { data: tpl, error: tplErr } = await sb
      .from("plan_templates")
      .select("name, prices, monthly_classes, accepts_discount_codes, discount_code")
      .eq("id", planTemplateId)
      .single();
    if (tplErr || !tpl) {
      return { statusCode: 404, body: JSON.stringify({ error: "Plan no encontrado" }) };
    }
    const basePrice = Number(tpl.prices?.[period] || 0);
    if (basePrice <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: `El plan no tiene precio para ${period}` }) };
    }
    let finalPrice = basePrice;
    if (discountCode && tpl.accepts_discount_codes && tpl.discount_code === discountCode) {
      finalPrice = Math.round(basePrice * 0.9);
    }

    // 4. Payment pending
    // Provider value: la tabla payments admite ('stripe','mercado_pago','paypal').
    // Por ahora guardamos los pagos Khipu con provider='mercado_pago' para no
    // romper el CHECK existente, distinguiendo por el provider_transaction_id
    // (que para Khipu tiene formato 'khipu:<payment_id>'). Si se requiere
    // separación contable estricta, agregamos migración que extienda el CHECK.
    const { data: payment, error: payErr } = await sb
      .from("payments")
      .insert({
        student_id: studentId,
        plan_template_id: planTemplateId,
        duration_months: months,
        amount: finalPrice,
        currency: "CLP",
        provider: "mercado_pago",
        provider_transaction_id: `khipu:pending-${Date.now()}`,
        status: "pending",
      })
      .select("id")
      .single();
    if (payErr || !payment) {
      return { statusCode: 500, body: JSON.stringify({ error: `No se pudo crear el pago: ${payErr?.message}` }) };
    }
    const paymentId = payment.id;

    // 5. Khipu API
    const khipuBody = {
      subject: `${tpl.name} · ${months} ${months === 1 ? "mes" : "meses"}`,
      amount: finalPrice,
      currency: "CLP",
      transaction_id: paymentId,
      payer_email: studentEmail,
      notify_url: `${siteUrl}/.netlify/functions/khipu-webhook`,
      return_url: `${siteUrl}/dashboard/student?tab=pagos&kh=success&pid=${paymentId}`,
      cancel_url: `${siteUrl}/dashboard/student?tab=pagos&kh=cancel&pid=${paymentId}`,
      body: `${tpl.monthly_classes} clases/mes — HTK Center`,
      notify_api_version: "3.0",
    };

    const khRes = await fetch("https://payment-api.khipu.com/v3/payments", {
      method: "POST",
      headers: {
        "x-api-key": khipuKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(khipuBody),
    });
    const khJson: any = await khRes.json().catch(() => ({}));
    if (!khRes.ok) {
      await sb.from("payments").update({ status: "failed" }).eq("id", paymentId);
      console.error("khipu-create: Khipu error", khRes.status, khJson);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: khJson.message || `Khipu devolvió ${khRes.status}` }),
      };
    }

    await sb
      .from("payments")
      .update({ provider_transaction_id: `khipu:${khJson.payment_id}` })
      .eq("id", paymentId);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_url: khJson.payment_url,
        payment_id: khJson.payment_id,
        internal_payment_id: paymentId,
      }),
    };
  } catch (err: any) {
    console.error("khipu-create error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

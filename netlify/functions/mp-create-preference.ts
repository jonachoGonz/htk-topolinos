/**
 * Mercado Pago Checkout Pro — Preference Creator
 *
 * POST /.netlify/functions/mp-create-preference
 * Auth: Bearer <user_access_token>  (debe ser el alumno que paga)
 * Body: { planTemplateId, months, discountCode? }
 *
 * Devuelve: { init_point, preference_id, payment_id }
 *
 * Env requeridas:
 *   MP_ACCESS_TOKEN              (APP_USR-... o TEST-... de MP Chile)
 *   SUPABASE_URL                 (sin trailing slash)
 *   SUPABASE_SERVICE_ROLE_KEY    (para escribir payments con service role)
 *   URL                          (URL pública del sitio, p.ej. https://htkcenter.netlify.app)
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
  const mpToken = process.env.MP_ACCESS_TOKEN?.trim() || "";
  const siteUrl =
    process.env.URL?.trim() || process.env.DEPLOY_URL?.trim() || "http://localhost:8080";

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
    };
  }
  if (!mpToken) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing MP_ACCESS_TOKEN — agrega la credencial de Mercado Pago en Netlify env vars" }),
    };
  }

  try {
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // 1. Verificar auth del caller
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

    // 3. Cargar template (precio + nombre)
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
      return { statusCode: 400, body: JSON.stringify({ error: `El plan no tiene precio configurado para ${period}` }) };
    }
    let finalPrice = basePrice;
    if (discountCode && tpl.accepts_discount_codes && tpl.discount_code === discountCode) {
      finalPrice = Math.round(basePrice * 0.9); // 10%
    }

    // 4. Cargar nombre del alumno (para statement_descriptor / metadata)
    const { data: profile } = await sb
      .from("profiles")
      .select("full_name")
      .eq("id", studentId)
      .single();

    // 5. Insertar payment pending y guardar id como external_reference
    const { data: payment, error: payErr } = await sb
      .from("payments")
      .insert({
        student_id: studentId,
        plan_template_id: planTemplateId,
        duration_months: months,
        amount: finalPrice,
        currency: "CLP",
        provider: "mercado_pago",
        provider_transaction_id: `pending-${Date.now()}`,
        status: "pending",
      })
      .select("id")
      .single();
    if (payErr || !payment) {
      return { statusCode: 500, body: JSON.stringify({ error: `No se pudo crear el pago: ${payErr?.message}` }) };
    }
    const paymentId = payment.id;

    // 6. Crear preferencia en MP
    const preferenceBody = {
      items: [
        {
          title: `${tpl.name} · ${months} ${months === 1 ? "mes" : "meses"}`,
          quantity: 1,
          unit_price: finalPrice,
          currency_id: "CLP",
          description: `${tpl.monthly_classes} clases/mes`,
        },
      ],
      payer: {
        email: studentEmail,
        name: profile?.full_name?.split(" ")[0] || undefined,
      },
      back_urls: {
        success: `${siteUrl}/dashboard/student?tab=pagos&mp=success&pid=${paymentId}`,
        failure: `${siteUrl}/dashboard/student?tab=pagos&mp=failure&pid=${paymentId}`,
        pending: `${siteUrl}/dashboard/student?tab=pagos&mp=pending&pid=${paymentId}`,
      },
      auto_return: "approved",
      external_reference: paymentId,
      notification_url: `${siteUrl}/.netlify/functions/mp-webhook`,
      statement_descriptor: "HTK CENTER",
      metadata: {
        student_id: studentId,
        plan_template_id: planTemplateId,
        duration_months: months,
      },
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preferenceBody),
    });
    const mpJson: any = await mpRes.json().catch(() => ({}));
    if (!mpRes.ok) {
      // Marcamos el payment como failed para no dejar pending huérfanos
      await sb.from("payments").update({ status: "failed" }).eq("id", paymentId);
      console.error("mp-create-preference: MP error", mpJson);
      return {
        statusCode: 502,
        body: JSON.stringify({ error: mpJson.message || `Mercado Pago devolvió ${mpRes.status}` }),
      };
    }

    // 7. Guardar preference_id en el payment para reconciliación
    await sb
      .from("payments")
      .update({ provider_transaction_id: mpJson.id })
      .eq("id", paymentId);

    const initPoint = mpJson.init_point || mpJson.sandbox_init_point;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        init_point: initPoint,
        preference_id: mpJson.id,
        payment_id: paymentId,
      }),
    };
  } catch (err: any) {
    console.error("mp-create-preference error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

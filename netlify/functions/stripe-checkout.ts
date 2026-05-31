/**
 * Stripe Checkout Session Creator (Netlify Function)
 *
 * POST /.netlify/functions/stripe-checkout
 * Body: { studentId, planTemplateId, months, amount, discountCode? }
 * Returns: { url } — Stripe-hosted checkout URL
 *
 * Setup:
 * - STRIPE_SECRET_KEY env var (sk_live_... or sk_test_...)
 * - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (for plan name lookup)
 * - URL (your site's public URL, e.g. https://htk-topolinos.netlify.app)
 */

import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || "http://localhost:8080";

  if (!secretKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "STRIPE_SECRET_KEY not configured" }) };
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(secretKey, { apiVersion: "2024-11-20.acacia" } as any);

    const body = JSON.parse(event.body || "{}");
    const { studentId, planTemplateId, months = 1, amount, discountCode } = body;

    if (!studentId || !planTemplateId || !amount) {
      return { statusCode: 400, body: JSON.stringify({ error: "Missing required fields" }) };
    }

    // Fetch plan name (for product description)
    let productName = "Plan HTK";
    if (supabaseUrl && serviceRoleKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(supabaseUrl, serviceRoleKey);
      const { data } = await sb.from("plan_templates").select("name").eq("id", planTemplateId).single();
      if (data?.name) productName = data.name;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "clp",
          product_data: {
            name: `${productName} (${months} mes${months > 1 ? "es" : ""})`,
          },
          unit_amount: Math.round(amount), // CLP is zero-decimal, send as-is
        },
        quantity: 1,
      }],
      metadata: {
        student_id: studentId,
        plan_template_id: planTemplateId,
        months: String(months),
        discount_code: discountCode || "",
      },
      success_url: `${siteUrl}/dashboard/student?payment=success`,
      cancel_url: `${siteUrl}/dashboard/student?payment=cancelled`,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    };
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

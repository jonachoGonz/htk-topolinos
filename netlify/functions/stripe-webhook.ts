/**
 * Stripe Webhook Handler (Netlify Function)
 *
 * Listens for Stripe events and updates the database accordingly.
 *
 * Setup:
 * 1. Install: npm install stripe @supabase/supabase-js
 * 2. Environment vars in Netlify:
 *    - STRIPE_SECRET_KEY        (sk_live_... or sk_test_...)
 *    - STRIPE_WEBHOOK_SECRET    (whsec_... from Stripe Dashboard)
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY  (admin key — DO NOT use anon key here)
 * 3. In Stripe Dashboard → Developers → Webhooks → Add endpoint:
 *    URL: https://YOUR_DOMAIN/.netlify/functions/stripe-webhook
 *    Events: checkout.session.completed, payment_intent.succeeded
 *
 * This is a SCAFFOLD — make sure to test in Stripe test mode first.
 */

import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  // Method check
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Missing env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
      }),
    };
  }

  // Dynamic imports (Netlify Functions cold-start friendly)
  const Stripe = (await import("stripe")).default;
  const { createClient } = await import("@supabase/supabase-js");

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-11-20.acacia" } as any);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Verify Stripe signature
  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body || "",
      sig || "",
      webhookSecret
    );
  } catch (e: any) {
    return { statusCode: 400, body: `Webhook Error: ${e.message}` };
  }

  // Handle the event
  try {
    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object as any;
        const studentId = session.metadata?.student_id;
        const planTemplateId = session.metadata?.plan_template_id;
        const months = parseInt(session.metadata?.months || "1", 10);

        if (studentId && planTemplateId) {
          // Get plan template
          const { data: tpl } = await supabase
            .from("plan_templates")
            .select("name, monthly_classes")
            .eq("id", planTemplateId)
            .single();

          if (tpl) {
            // Deactivate existing
            await supabase.from("plans")
              .update({ is_active: false })
              .eq("student_id", studentId)
              .eq("is_active", true);

            // Create new plan
            const total = tpl.monthly_classes * months;
            const expiry = new Date();
            expiry.setMonth(expiry.getMonth() + months);

            await supabase.from("plans").insert({
              student_id: studentId,
              name: tpl.name,
              total_sessions: total,
              remaining_sessions: total,
              monthly_class_count: tpl.monthly_classes,
              expiry_date: expiry.toISOString().split("T")[0],
              is_active: true,
            });

            // Record payment
            await supabase.from("payments").insert({
              student_id: studentId,
              plan_template_id: planTemplateId,
              duration_months: months,
              amount: session.amount_total || 0,
              currency: session.currency?.toUpperCase() || "CLP",
              provider: "stripe",
              provider_transaction_id: session.payment_intent || session.id,
              stripe_session_id: session.id,
              status: "succeeded",
              receipt_url: session.url || null,
            });

            // Notify student
            await supabase.rpc("create_notification", {
              p_user_id: studentId,
              p_type: "plan_purchased",
              p_title: "¡Pago confirmado!",
              p_body: `Tu plan "${tpl.name}" ya está activo por ${months} mes(es)`,
              p_link: "/dashboard/student",
              p_metadata: { session_id: session.id },
            });
          }
        }
        break;
      }

      case "payment_intent.succeeded":
        // Optional secondary log; checkout.session.completed already handles assignment
        break;

      default:
        console.log(`Unhandled Stripe event type: ${stripeEvent.type}`);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err: any) {
    console.error("Stripe webhook handler error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

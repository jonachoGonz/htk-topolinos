/**
 * Class Reminders & Plan Expiry — Scheduled Function (Netlify Scheduled Functions)
 *
 * Configure in netlify.toml:
 *   [[scheduled.functions]]
 *   name = "send-reminders"
 *   schedule = "@hourly"
 *
 * What it does (every hour):
 *  1. Sends in-app notifications for classes happening ~24h from now (configurable)
 *  2. Sends in-app notifications when a plan expires within 7 days
 *  3. (optional) Sends emails via Resend if RESEND_API_KEY is set
 *
 * Required env:
 *  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *  - (optional) RESEND_API_KEY, RESEND_FROM_EMAIL
 */

import type { Handler } from "@netlify/functions";

export const handler: Handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: "Missing Supabase env vars" };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(supabaseUrl, serviceRoleKey);

  let remindersSent = 0;
  let expiryNotifsSent = 0;

  // ===== 1. Class reminders (~24h before) =====
  try {
    // Read settings (hours_before)
    const { data: settings } = await sb.from("app_settings").select("email_reminder_hours_before").eq("id", 1).single();
    const hoursBefore = settings?.email_reminder_hours_before || 24;

    const reminderWindow = new Date();
    reminderWindow.setHours(reminderWindow.getHours() + hoursBefore);
    const dateStr = reminderWindow.toISOString().split("T")[0];

    const { data: bookings } = await sb
      .from("bookings")
      .select("id, student_id, professional_id, booking_date, start_time, end_time")
      .eq("status", "confirmed")
      .eq("booking_date", dateStr);

    for (const b of bookings || []) {
      // Avoid double-notify: check existing for this booking
      const { data: existing } = await sb
        .from("notifications")
        .select("id")
        .eq("user_id", b.student_id)
        .eq("type", "booking_reminder")
        .contains("metadata", { booking_id: b.id })
        .limit(1);

      if (existing && existing.length > 0) continue;

      await sb.rpc("create_notification", {
        p_user_id: b.student_id,
        p_type: "booking_reminder",
        p_title: "Recordatorio de clase",
        p_body: `Mañana ${b.start_time.slice(0,5)} – ${b.end_time.slice(0,5)} tienes una clase agendada`,
        p_link: "/dashboard/student/calendar",
        p_metadata: { booking_id: b.id },
      });
      remindersSent++;
    }
  } catch (e) {
    console.error("Reminder loop error:", e);
  }

  // ===== 2. Plan expiry warnings (within 7 days) =====
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 7);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];

    const { data: expiring } = await sb
      .from("plans")
      .select("id, student_id, name, expiry_date")
      .eq("is_active", true)
      .gte("expiry_date", todayStr)
      .lte("expiry_date", cutoffStr);

    for (const p of expiring || []) {
      const { data: existing } = await sb
        .from("notifications")
        .select("id")
        .eq("user_id", p.student_id)
        .eq("type", "plan_expiry")
        .contains("metadata", { plan_id: p.id })
        .limit(1);

      if (existing && existing.length > 0) continue;

      const daysLeft = Math.ceil(
        (new Date(p.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      await sb.rpc("create_notification", {
        p_user_id: p.student_id,
        p_type: "plan_expiry",
        p_title: "Tu plan vence pronto",
        p_body: `Tu plan "${p.name}" expira en ${daysLeft} días. Renueva para no perder tus clases.`,
        p_link: "/dashboard/student",
        p_metadata: { plan_id: p.id, days_left: daysLeft },
      });
      expiryNotifsSent++;
    }
  } catch (e) {
    console.error("Expiry loop error:", e);
  }

  // ===== 3. (Optional) Send emails via Resend =====
  // To enable: set RESEND_API_KEY + RESEND_FROM_EMAIL in env, then look up
  // user emails from auth.users (requires service role) and POST to Resend.
  // Left as scaffolding to keep this function lightweight.

  return {
    statusCode: 200,
    body: JSON.stringify({
      remindersSent,
      expiryNotifsSent,
      runAt: new Date().toISOString(),
    }),
  };
};

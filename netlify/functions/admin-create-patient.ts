/**
 * Admin: Create a new patient (auth user + profile + invite email)
 *
 * POST /.netlify/functions/admin-create-patient
 * Auth: Bearer <user_access_token>  (must belong to an admin)
 * Body: { full_name, email, phone?, rut_dni?, send_invite? }
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import type { Handler } from "@netlify/functions";
import { sendEmail, htmlTemplate } from "./_email";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
    };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Auth check: verify caller is admin
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return { statusCode: 401, body: JSON.stringify({ error: "Missing Authorization header" }) };
    }
    const token = authHeader.slice("Bearer ".length);
    const { data: callerData, error: callerErr } = await sb.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid token" }) };
    }
    const { data: callerProfile } = await sb
      .from("profiles")
      .select("is_admin")
      .eq("id", callerData.user.id)
      .single();
    if (!callerProfile?.is_admin) {
      return { statusCode: 403, body: JSON.stringify({ error: "Solo admin puede crear pacientes" }) };
    }

    // Parse body
    const body = JSON.parse(event.body || "{}");
    const { full_name, email, phone, rut_dni, password, send_invite } = body;
    if (!full_name?.trim() || !email?.trim()) {
      return { statusCode: 400, body: JSON.stringify({ error: "full_name y email son requeridos" }) };
    }
    if (!send_invite && !password) {
      return { statusCode: 400, body: JSON.stringify({ error: "Define password o usa send_invite=true" }) };
    }
    if (password && password.length < 6) {
      return { statusCode: 400, body: JSON.stringify({ error: "Password debe tener al menos 6 caracteres" }) };
    }

    // Create auth user via admin API
    let userId: string;
    if (send_invite) {
      const { data, error } = await sb.auth.admin.inviteUserByEmail(email, {
        data: { full_name, role: "student" },
      });
      if (error) {
        if (/already|exists/i.test(error.message)) {
          const { data: list } = await sb.auth.admin.listUsers();
          const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (!existing) return { statusCode: 409, body: JSON.stringify({ error: error.message }) };
          userId = existing.id;
        } else {
          return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
        }
      } else {
        userId = data.user.id;
      }
    } else {
      // Create with admin-provided password
      const { data, error } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: "student" },
      });
      if (error) {
        if (/already|exists/i.test(error.message)) {
          const { data: list } = await sb.auth.admin.listUsers();
          const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (!existing) return { statusCode: 409, body: JSON.stringify({ error: error.message }) };
          userId = existing.id;
          // Try to update password for existing user
          await sb.auth.admin.updateUserById(userId, { password });
        } else {
          return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
        }
      } else {
        userId = data.user.id;
      }
    }

    // Upsert profile (trigger may have already created it; we ensure all fields)
    await sb.from("profiles").upsert(
      {
        id: userId,
        full_name,
        email,
        phone: phone || null,
        rut_dni: rut_dni || null,
        role: "student",
        is_admin: false,
      },
      { onConflict: "id" }
    );

    // Email confirmation when admin sets the password directly
    if (!send_invite && password) {
      await sendEmail({
        to: email,
        subject: "Bienvenido a HTK Center — tus accesos",
        html: htmlTemplate({
          title: `Hola ${full_name},`,
          body: `Se ha creado tu cuenta en HTK Center.<br/><br/>
            <strong>Email:</strong> ${email}<br/>
            <strong>Contraseña inicial:</strong> ${password}<br/><br/>
            Te recomendamos cambiarla luego del primer ingreso desde Configuración.`,
          ctaText: "Ingresar al portal",
          ctaUrl: `${process.env.URL || "https://htk-topolinos.netlify.app"}/login`,
        }),
      });
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, user_id: userId, sent_invite: !!send_invite }),
    };
  } catch (err: any) {
    console.error("admin-create-patient error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

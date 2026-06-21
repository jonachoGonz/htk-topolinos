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
import { createClient } from "@supabase/supabase-js";
import { sendEmail, htmlTemplate } from "./_email";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // Normaliza la URL: trim, sin trailing slash, sin paths Supabase comunes
  // que la gente a veces copia de más al pegar en Netlify env vars
  // (/rest/v1, /auth/v1). Sin esto, getUser() devuelve 404 "Invalid path".
  const rawUrl = process.env.SUPABASE_URL?.trim() || "";
  const supabaseUrl = rawUrl
    .replace(/\/+$/, "")
    .replace(/\/(rest|auth|storage|realtime)\/v\d+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
    };
  }

  try {
    const sb = createClient(supabaseUrl, serviceRoleKey);


    // Auth check: verify caller is admin
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return { statusCode: 401, body: JSON.stringify({ error: "Missing Authorization header" }) };
    }
    const token = authHeader.slice("Bearer ".length);
    const { data: callerData, error: callerErr } = await sb.auth.getUser(token);
    if (callerErr || !callerData?.user) {
      console.error("admin-create-patient: invalid token", callerErr);
      return { statusCode: 401, body: JSON.stringify({ error: "Invalid token" }) };
    }
    const { data: callerProfile, error: profileErr } = await sb
      .from("profiles")
      .select("is_admin")
      .eq("id", callerData.user.id)
      .single();
    if (!callerProfile?.is_admin) {
      if (profileErr) {
        console.error("admin-create-patient: profile lookup failed", {
          user_id: callerData.user.id,
          err: profileErr.message,
        });
      }
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Solo admin puede crear pacientes" }),
      };
    }

    // Parse body
    const body = JSON.parse(event.body || "{}");
    const { full_name, email, phone, rut_dni, password, send_invite } = body;
    // Role: "student" (default) o "teacher". Cuando el admin crea un
    // profesor, el profile queda con role='teacher' y el JWT del usuario
    // refleja ese rol tras login.
    const role: "student" | "teacher" =
      body.role === "teacher" ? "teacher" : "student";
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
        data: { full_name, role },
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
        user_metadata: { full_name, role },
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

    // socio_number autogenerado solo para alumnos (no profesores). Formato
    // HTKTOP-001, HTKTOP-002... vía secuencia Postgres. Los alumnos migrados
    // del centro anterior se reasignan manualmente al prefijo HTK- después,
    // fuera de este flujo.
    let socioNumber: string | null = null;
    if (role === "student") {
      const { data: socioData, error: socioErr } = await sb.rpc("next_socio_number");
      if (socioErr) {
        console.error("admin-create-patient: next_socio_number failed", socioErr);
      } else {
        socioNumber = socioData as string;
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
        role,
        is_admin: false,
        ...(socioNumber ? { socio_number: socioNumber } : {}),
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

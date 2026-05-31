/**
 * Resend email wrapper — used by other Netlify Functions.
 *
 * Env:
 *   RESEND_API_KEY     (sk_resend_...)
 *   RESEND_FROM_EMAIL  (e.g. "HTK Center <noreply@yourdomain.com>")
 *
 * If env not set, sendEmail returns { skipped: true } so callers can degrade gracefully.
 */

export interface EmailOpts {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: EmailOpts): Promise<{ success: boolean; skipped?: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "HTK Center <noreply@htk-center.app>";
  if (!key) return { success: false, skipped: true };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text || opts.html.replace(/<[^>]+>/g, ""),
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: json.message || `HTTP ${res.status}` };
    return { success: true, id: json.id };
  } catch (e: any) {
    return { success: false, error: e.message || String(e) };
  }
}

export function htmlTemplate(opts: { title: string; body: string; ctaText?: string; ctaUrl?: string }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0e1a;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0f131a;border:1px solid #ffffff10;border-radius:12px;overflow:hidden">
        <tr><td style="padding:24px 28px;border-bottom:1px solid #ffffff10">
          <h1 style="margin:0;color:#00d4ff;font-size:22px;font-weight:bold">HTK Center</h1>
        </td></tr>
        <tr><td style="padding:28px;color:#e5e7eb;font-size:14px;line-height:1.6">
          <h2 style="margin:0 0 12px;color:#fff;font-size:18px">${opts.title}</h2>
          <div>${opts.body}</div>
          ${opts.ctaUrl ? `<p style="margin:24px 0 0"><a href="${opts.ctaUrl}" style="display:inline-block;background:#00d4ff;color:#05050a;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${opts.ctaText || "Ver más"}</a></p>` : ""}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #ffffff10;color:#71717a;font-size:11px">
          Este correo fue enviado por HTK Center. Si no esperabas esto, ignóralo.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

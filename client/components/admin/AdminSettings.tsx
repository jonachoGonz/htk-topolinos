import { useEffect, useState } from "react";
import { Save, Loader2, Settings as SettingsIcon, Building, Clock, CreditCard, MessageSquare, Instagram, Music2 } from "lucide-react";
import { toast } from "sonner";
import { getAppSettings, updateAppSettings, type AppSettings } from "@/services/supabase";

const DAYS = [
  ["mon", "Lunes"], ["tue", "Martes"], ["wed", "Miércoles"],
  ["thu", "Jueves"], ["fri", "Viernes"], ["sat", "Sábado"], ["sun", "Domingo"],
];

export default function AdminSettings() {
  const [form, setForm] = useState<Partial<AppSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await getAppSettings();
      if (r.success) setForm(r.data || {});
      else toast.error(`Error: ${r.error}`);
      setLoading(false);
    })();
  }, []);

  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const hours = (form.operating_hours || {}) as Record<string, [string, string]>;
  const setHours = (day: string, idx: 0 | 1, val: string) => {
    const cur = hours[day] || ["", ""];
    cur[idx] = val;
    set("operating_hours", { ...hours, [day]: cur as [string, string] });
  };
  const removeDayHours = (day: string) => {
    const copy = { ...hours };
    delete copy[day];
    set("operating_hours", copy);
  };

  const handleSave = async () => {
    setSaving(true);
    const r = await updateAppSettings(form);
    if (r.success) toast.success("Configuración guardada");
    else toast.error(`Error: ${r.error}`);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando configuración…
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <SettingsIcon className="w-5 h-5 text-[#00d4ff]" />
        <div>
          <h2 className="text-xl font-bold text-white font-montserrat">Configuración Global</h2>
          <p className="text-gray-400 text-sm font-inter">Ajustes que aplican a todo el centro</p>
        </div>
      </div>

      {/* Center info */}
      <Section title="Información del centro" icon={<Building className="w-4 h-4 text-[#00d4ff]" />}>
        <Grid>
          <Field label="Nombre del centro">
            <Input value={form.center_name || ""} onChange={(v) => set("center_name", v)} />
          </Field>
          <Field label="Email de contacto">
            <Input type="email" value={form.center_email || ""} onChange={(v) => set("center_email", v)} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.center_phone || ""} onChange={(v) => set("center_phone", v)} />
          </Field>
          <Field label="URL del logo">
            <Input value={form.logo_url || ""} onChange={(v) => set("logo_url", v)} placeholder="https://..." />
          </Field>
          <Field label="Dirección" full>
            <Input value={form.center_address || ""} onChange={(v) => set("center_address", v)} />
          </Field>
          <Field label="Tagline / lema" full>
            <Input value={form.tagline || ""} onChange={(v) => set("tagline", v)} placeholder="Excelencia en deporte y kinesiología..." />
          </Field>
          <Field label="Color primario">
            <div className="flex gap-2 items-center">
              <input type="color" value={form.primary_color || "#00d4ff"}
                onChange={(e) => set("primary_color", e.target.value)}
                className="w-12 h-9 rounded border border-white/10 bg-transparent cursor-pointer" />
              <Input value={form.primary_color || ""} onChange={(v) => set("primary_color", v)} />
            </div>
          </Field>
        </Grid>
      </Section>

      {/* Social / Contact */}
      <Section title="Redes sociales y contacto público" icon={<Instagram className="w-4 h-4 text-[#00d4ff]" />}>
        <Grid>
          <Field label="WhatsApp">
            <Input value={form.whatsapp_phone || ""} onChange={(v) => set("whatsapp_phone", v)} placeholder="+56994748507" />
          </Field>
          <Field label="Instagram URL">
            <Input value={form.instagram_url || ""} onChange={(v) => set("instagram_url", v)} placeholder="https://instagram.com/htk_center" />
          </Field>
          <Field label="TikTok usuario">
            <Input value={form.tiktok_handle || ""} onChange={(v) => set("tiktok_handle", v)} placeholder="HTK.center" />
          </Field>
          <Field label="Facebook URL">
            <Input value={form.facebook_url || ""} onChange={(v) => set("facebook_url", v)} placeholder="https://facebook.com/..." />
          </Field>
          <Field label="Google Maps URL" full>
            <Input value={form.google_maps_url || ""} onChange={(v) => set("google_maps_url", v)} placeholder="https://maps.google.com/?q=..." />
          </Field>
        </Grid>
      </Section>

      {/* Policies */}
      <Section title="Políticas operacionales" icon={<Clock className="w-4 h-4 text-[#00d4ff]" />}>
        <Grid>
          <Field label="Horas mínimas para cancelar (anticipación)">
            <Input type="number" value={String(form.cancellation_hours ?? 12)}
              onChange={(v) => set("cancellation_hours", parseInt(v) || 12)} />
          </Field>
          <Field label="Capacidad por defecto de cada clase">
            <Input type="number" value={String(form.default_class_capacity ?? 5)}
              onChange={(v) => set("default_class_capacity", parseInt(v) || 5)} />
          </Field>
          <Field label="Duración por defecto del plan (meses)">
            <Input type="number" value={String(form.default_plan_duration_months ?? 1)}
              onChange={(v) => set("default_plan_duration_months", parseInt(v) || 1)} />
          </Field>
          <Field label="Horas antes para recordatorio email">
            <Input type="number" value={String(form.email_reminder_hours_before ?? 24)}
              onChange={(v) => set("email_reminder_hours_before", parseInt(v) || 24)} />
          </Field>
        </Grid>
      </Section>

      {/* Operating hours */}
      <Section title="Horario de atención del centro" icon={<Clock className="w-4 h-4 text-[#00d4ff]" />}>
        <p className="text-xs text-gray-500 mb-3">
          Define el horario en que opera cada día. Deja vacío si el centro está cerrado ese día.
        </p>
        <div className="space-y-2">
          {DAYS.map(([key, label]) => {
            const open = hours[key]?.[0] || "";
            const close = hours[key]?.[1] || "";
            const enabled = !!(open || close);
            return (
              <div key={key} className="flex items-center gap-3 p-2 rounded-lg bg-[#0a0e1a] border border-white/[0.04]">
                <label className="w-24 text-sm text-white font-semibold">{label}</label>
                <input type="time" value={open} onChange={(e) => setHours(key, 0, e.target.value)}
                  className="bg-[#0f131a] border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
                <span className="text-gray-500 text-xs">a</span>
                <input type="time" value={close} onChange={(e) => setHours(key, 1, e.target.value)}
                  className="bg-[#0f131a] border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
                {enabled && (
                  <button type="button" onClick={() => removeDayHours(key)}
                    className="ml-auto text-xs text-red-400 hover:bg-red-500/10 px-2 py-1 rounded transition">
                    Cerrado
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Welcome messages */}
      <Section title="Mensajes de bienvenida" icon={<MessageSquare className="w-4 h-4 text-[#00d4ff]" />}>
        <Field label="Mensaje para alumno (al iniciar sesión)">
          <Textarea value={form.welcome_message_student || ""} onChange={(v) => set("welcome_message_student", v)} rows={2} />
        </Field>
        <Field label="Mensaje para profesional">
          <Textarea value={form.welcome_message_teacher || ""} onChange={(v) => set("welcome_message_teacher", v)} rows={2} />
        </Field>
      </Section>

      {/* Stripe */}
      <Section title="Configuración Stripe (pagos)" icon={<CreditCard className="w-4 h-4 text-[#00d4ff]" />}>
        <p className="text-xs text-amber-300/80 mb-2">
          ⚠ Solo el <strong>publishable key</strong> va aquí. El <strong>secret key</strong> debe ir en variables de entorno del backend.
        </p>
        <Grid>
          <Field label="Publishable key">
            <Input value={form.stripe_publishable_key || ""} onChange={(v) => set("stripe_publishable_key", v)} placeholder="pk_live_..." />
          </Field>
          <Field label="País de la cuenta">
            <Input value={form.stripe_account_country || ""} onChange={(v) => set("stripe_account_country", v)} placeholder="CL" />
          </Field>
          <Field label="Moneda por defecto">
            <select value={form.default_currency || "CLP"}
              onChange={(e) => set("default_currency", e.target.value)}
              className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40">
              <option value="CLP">CLP — Peso chileno</option>
              <option value="USD">USD — Dólar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="ARS">ARS — Peso argentino</option>
              <option value="MXN">MXN — Peso mexicano</option>
            </select>
          </Field>
        </Grid>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-[#0a0e1a] border-t border-white/10 -mx-6 -mb-6 px-6 py-3 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] text-sm font-bold font-lexend transition disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar configuración
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: any) {
  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 space-y-3">
      <h3 className="text-white font-semibold font-lexend text-sm flex items-center gap-2">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}
function Grid({ children }: any) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, children, full }: any) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{label}</label>
      {children}
    </div>
  );
}
function Input({ value, onChange, type = "text", placeholder }: any) {
  return (
    <input type={type} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
  );
}
function Textarea({ value, onChange, rows = 3 }: any) {
  return (
    <textarea value={value} rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
  );
}

import { useEffect, useState, useRef } from "react";
import { Save, Loader2, Plus, X, Award, GraduationCap, Languages, Globe, Instagram, Linkedin } from "lucide-react";
import { toast } from "sonner";
import {
  getTeacherProfile, updateTeacherProfile, supabase,
  type TeacherProfile, type Certification,
} from "@/services/supabase";
import PhotoUploader from "./PhotoUploader";

interface TeacherProfileFormProps {
  teacherId: string;
  onDirtyChange?: (dirty: boolean) => void;
}

const SPECIALTY_SUGGESTIONS = [
  "Kinesiología deportiva", "Kinesiología clínica", "Rehabilitación",
  "Punción seca", "Terapia manual", "Pilates terapéutico",
  "Nutrición deportiva", "Nutrición clínica",
  "Entrenamiento funcional", "Preparación física",
];
const LANGUAGE_OPTIONS = [
  ["es", "Español"], ["en", "Inglés"], ["pt", "Portugués"],
  ["fr", "Francés"], ["de", "Alemán"], ["it", "Italiano"],
];

export default function TeacherProfileForm({ teacherId, onDirtyChange }: TeacherProfileFormProps) {
  const [form, setForm] = useState<Partial<TeacherProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState("");
  const savedSnapshotRef = useRef<Partial<TeacherProfile>>({});
  const lastDirtyRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTeacherProfile(teacherId),
      // profiles.email is often null because the canonical email lives in
      // auth.users. Pull it from there so Mi Perfil shows the real address.
      supabase.auth.getUser(),
    ]).then(([profRes, authRes]) => {
      const profile = profRes.success ? profRes.data : null;
      const authEmail = authRes.data?.user?.email;
      if (!profRes.success) toast.error(`Error: ${profRes.error}`);
      const loaded = {
        ...(profile ?? {}),
        // prefer the profile.email if explicitly set, fall back to auth.users
        email: profile?.email || authEmail || "",
      };
      setForm(loaded);
      savedSnapshotRef.current = loaded;
      setLoading(false);
    });
  }, [teacherId]);

  useEffect(() => {
    const dirty = JSON.stringify(form) !== JSON.stringify(savedSnapshotRef.current);
    if (dirty !== lastDirtyRef.current) {
      lastDirtyRef.current = dirty;
      onDirtyChange?.(dirty);
    }
  }, [form, onDirtyChange]);

  const set = <K extends keyof TeacherProfile>(k: K, v: TeacherProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const specialties = form.specialties || [];
  const certifications = form.certifications || [];
  const languages = form.languages || [];
  const social = form.social_links || {};

  const toggleSpecialty = (s: string) =>
    set("specialties", specialties.includes(s)
      ? specialties.filter((x) => x !== s)
      : [...specialties, s]);

  const addCustomSpecialty = () => {
    const s = newSpecialty.trim();
    if (!s) return;
    if (specialties.includes(s)) return;
    set("specialties", [...specialties, s]);
    setNewSpecialty("");
  };

  const toggleLanguage = (lang: string) =>
    set("languages", languages.includes(lang)
      ? languages.filter((l) => l !== lang)
      : [...languages, lang]);

  const addCertification = () =>
    set("certifications", [...certifications, { title: "", issuer: "", year: undefined, url: "" }]);
  const updateCert = (i: number, patch: Partial<Certification>) =>
    set("certifications", certifications.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const removeCert = (i: number) =>
    set("certifications", certifications.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.full_name?.trim()) {
      toast.error("Nombre es requerido");
      return;
    }
    setSaving(true);
    const r = await updateTeacherProfile(teacherId, form);
    if (r.success) {
      toast.success("Perfil guardado");
      savedSnapshotRef.current = form;
      lastDirtyRef.current = false;
      onDirtyChange?.(false);
    } else toast.error(`Error: ${r.error}`);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="py-12 flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Photo */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5">
        <PhotoUploader
          patientId={teacherId}
          currentUrl={form.photo_url}
          onChange={(url) => set("photo_url", url as any)}
          label="Foto del profesional"
        />
      </div>

      {/* Basic info */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold font-lexend text-sm">Información básica</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nombre completo *">
            <Input value={form.full_name || ""} onChange={(v) => set("full_name", v)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email || ""} onChange={(v) => set("email", v)} />
          </Field>
          <Field label="Teléfono">
            <Input value={form.phone || ""} onChange={(v) => set("phone", v)} />
          </Field>
          <Field label="Tipo de profesional">
            <select
              value={form.professional_type || "kinesiologist"}
              onChange={(e) => set("professional_type", e.target.value as any)}
              className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40"
            >
              <option value="kinesiologist">Kinesiólogo/a</option>
              <option value="nutritionist">Nutricionista</option>
              <option value="therapist">Terapeuta</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Bio */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold font-lexend text-sm">Biografía / Presentación</h2>
        <Field label="Bio breve (visible para los alumnos)">
          <textarea value={form.bio || ""} onChange={(e) => set("bio", e.target.value)} rows={4}
            placeholder="Cuéntale a tus alumnos quién eres, tu enfoque, tu experiencia…"
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Años de experiencia">
            <Input type="number" value={String(form.years_experience ?? "")} onChange={(v) => set("years_experience", parseInt(v) || undefined as any)} />
          </Field>
          <Field label="Formación académica">
            <Input value={form.education || ""} onChange={(v) => set("education", v)} placeholder="Universidad de Chile, 2015" />
          </Field>
        </div>
      </div>

      {/* Specialties */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 space-y-3">
        <h2 className="text-white font-semibold font-lexend text-sm flex items-center gap-2">
          <Award className="w-4 h-4 text-[#00d4ff]" /> Especialidades
        </h2>
        <p className="text-xs text-gray-500">Selecciona las que mejor te describen, o agrega una propia.</p>
        <div className="flex gap-2 flex-wrap">
          {SPECIALTY_SUGGESTIONS.map((s) => {
            const sel = specialties.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  sel ? "bg-[#00d4ff]/15 border border-[#00d4ff]/40 text-[#00d4ff]"
                      : "bg-[#0a0e1a] border border-white/10 text-gray-400 hover:text-white"
                }`}>
                {s}
              </button>
            );
          })}
        </div>
        {/* Custom selected specialties */}
        {specialties.filter((s) => !SPECIALTY_SUGGESTIONS.includes(s)).length > 0 && (
          <div className="pt-2 border-t border-white/[0.04]">
            <p className="text-[10px] text-gray-500 uppercase mb-2">Personalizadas</p>
            <div className="flex gap-2 flex-wrap">
              {specialties.filter((s) => !SPECIALTY_SUGGESTIONS.includes(s)).map((s) => (
                <span key={s} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#00d4ff]/15 border border-[#00d4ff]/40 text-[#00d4ff] text-xs">
                  {s}
                  <button onClick={() => toggleSpecialty(s)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <input value={newSpecialty} onChange={(e) => setNewSpecialty(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSpecialty())}
            placeholder="Agregar especialidad personalizada…"
            className="flex-1 bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
          <button onClick={addCustomSpecialty}
            className="px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs font-semibold hover:bg-white/[0.08] transition">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Certifications */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 space-y-3">
        <h2 className="text-white font-semibold font-lexend text-sm flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[#00d4ff]" /> Certificaciones / Cursos
        </h2>
        {certifications.map((c, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_80px_1fr_auto] gap-2 items-end p-3 rounded-lg bg-[#0a0e1a] border border-white/[0.04]">
            <Field label="Título"><Input value={c.title} onChange={(v) => updateCert(i, { title: v })} /></Field>
            <Field label="Institución"><Input value={c.issuer || ""} onChange={(v) => updateCert(i, { issuer: v })} /></Field>
            <Field label="Año"><Input type="number" value={String(c.year ?? "")} onChange={(v) => updateCert(i, { year: parseInt(v) || undefined })} /></Field>
            <Field label="URL (opcional)"><Input value={c.url || ""} onChange={(v) => updateCert(i, { url: v })} /></Field>
            <button onClick={() => removeCert(i)} className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button onClick={addCertification}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs font-semibold hover:bg-white/[0.08] transition">
          <Plus className="w-3.5 h-3.5" /> Agregar certificación
        </button>
      </div>

      {/* Languages */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 space-y-3">
        <h2 className="text-white font-semibold font-lexend text-sm flex items-center gap-2">
          <Languages className="w-4 h-4 text-[#00d4ff]" /> Idiomas
        </h2>
        <div className="flex gap-2 flex-wrap">
          {LANGUAGE_OPTIONS.map(([code, label]) => {
            const sel = languages.includes(code);
            return (
              <button key={code} type="button" onClick={() => toggleLanguage(code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  sel ? "bg-[#00d4ff]/15 border border-[#00d4ff]/40 text-[#00d4ff]"
                      : "bg-[#0a0e1a] border border-white/10 text-gray-400 hover:text-white"
                }`}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Social links */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 space-y-3">
        <h2 className="text-white font-semibold font-lexend text-sm flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#00d4ff]" /> Redes sociales / Web
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label={<><Instagram className="inline w-3 h-3 mr-1" />Instagram</>}>
            <Input value={social.instagram || ""} onChange={(v) => set("social_links", { ...social, instagram: v })} placeholder="@usuario" />
          </Field>
          <Field label={<><Linkedin className="inline w-3 h-3 mr-1" />LinkedIn</>}>
            <Input value={social.linkedin || ""} onChange={(v) => set("social_links", { ...social, linkedin: v })} placeholder="URL completa" />
          </Field>
          <Field label="Web personal">
            <Input value={social.web || ""} onChange={(v) => set("social_links", { ...social, web: v })} placeholder="https://..." />
          </Field>
        </div>
      </div>

      {/* Directory visibility */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.show_in_directory ?? true}
            onChange={(e) => set("show_in_directory", e.target.checked as any)} />
          <span className="text-sm text-white font-inter">
            Visible en el selector de profesionales (los alumnos pueden agendar conmigo)
          </span>
        </label>
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-[#0a0e1a] border-t border-white/10 -mx-6 -mb-6 px-6 py-3 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] text-sm font-bold font-lexend transition disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar perfil
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
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

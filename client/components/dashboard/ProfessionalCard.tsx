import { Award, Globe, Instagram, Linkedin, Languages } from "lucide-react";
import type { TeacherProfile } from "@/services/supabase";

interface Props {
  professional: TeacherProfile;
  compact?: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  kinesiologist: "Kinesiología",
  nutritionist: "Nutrición",
  therapist: "Terapia",
};
const LANG_LABELS: Record<string, string> = {
  es: "ES", en: "EN", pt: "PT", fr: "FR", de: "DE", it: "IT",
};

export default function ProfessionalCard({ professional, compact = false }: Props) {
  const p = professional;
  const social = p.social_links || {};

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0f131a] border border-white/[0.06]">
        {p.photo_url ? (
          <img src={p.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center">
            <span className="text-[#00d4ff] font-bold text-sm">
              {(p.full_name || "?").charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm truncate">{p.full_name}</p>
          <p className="text-gray-500 text-xs truncate">
            {TYPE_LABELS[p.professional_type || ""] || "—"}
            {p.years_experience ? ` • ${p.years_experience} años exp.` : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        {p.photo_url ? (
          <img src={p.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[#00d4ff] font-bold text-xl">
              {(p.full_name || "?").charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold font-lexend">{p.full_name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {p.professional_type && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {TYPE_LABELS[p.professional_type] || p.professional_type}
              </span>
            )}
            {p.years_experience != null && (
              <span className="text-xs text-gray-400">{p.years_experience} años de experiencia</span>
            )}
          </div>
        </div>
      </div>

      {/* Bio */}
      {p.bio && (
        <p className="text-sm text-gray-300 font-inter leading-relaxed">{p.bio}</p>
      )}

      {/* Specialties */}
      {p.specialties && p.specialties.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 flex items-center gap-1">
            <Award className="w-3 h-3" /> Especialidades
          </p>
          <div className="flex flex-wrap gap-1.5">
            {p.specialties.map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-gray-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Languages + social row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.04]">
        {p.languages && p.languages.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Languages className="w-3 h-3" />
            <span>{p.languages.map((l) => LANG_LABELS[l] || l.toUpperCase()).join(" · ")}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {social.instagram && (
            <a href={social.instagram.startsWith("http") ? social.instagram : `https://instagram.com/${social.instagram.replace("@","")}`}
              target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-pink-400 transition">
              <Instagram className="w-4 h-4" />
            </a>
          )}
          {social.linkedin && (
            <a href={social.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400 transition">
              <Linkedin className="w-4 h-4" />
            </a>
          )}
          {social.web && (
            <a href={social.web} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition">
              <Globe className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

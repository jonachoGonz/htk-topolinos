import { useEffect, useState } from "react";
import { CheckCircle2, ChevronRight, Loader2, Sparkles, ShieldCheck, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import {
  getOnboardingState, markOnboardingCompleted,
  updatePatient,
  type OnboardingState,
} from "@/services/supabase";
import PatientForm from "./PatientForm";

interface Props {
  userId: string;
  onComplete: () => void;
}

type Step = "welcome" | "profile" | "parq" | "done";

const FIELD_LABELS: Record<string, string> = {
  full_name: "Nombre completo",
  birth_date: "Fecha de nacimiento",
  phone: "Teléfono",
  parq: "PAR-Q (cuestionario de actividad física)",
  informed_consent_signed: "Consentimiento informado",
};

export default function OnboardingWizard({ userId, onComplete }: Props) {
  const [step, setStep] = useState<Step>("welcome");
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const refresh = async () => {
    const r = await getOnboardingState(userId);
    if (r.success) setState(r.data || null);
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [userId]);

  const handleMarkComplete = async () => {
    setMarking(true);
    const r = await markOnboardingCompleted(userId);
    if (r.success) {
      toast.success("¡Bienvenido! Tu perfil quedó completo.");
      onComplete();
    } else {
      toast.error(`Error: ${r.error}`);
    }
    setMarking(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <Loader2 className="w-6 h-6 animate-spin text-[#00d4ff]" />
      </div>
    );
  }

  if (state?.completed) return null;

  const missing = state?.missingFields || [];
  const totalSteps = 3;
  const stepIdx = step === "welcome" ? 0 : step === "profile" ? 1 : step === "parq" ? 2 : 3;
  const allFilled = missing.length === 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-[#0a0e1a] border border-white/10 rounded-xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header with progress */}
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white font-montserrat flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00d4ff]" /> Bienvenido a HTK Center
            </h2>
            <span className="text-xs text-gray-500">Paso {stepIdx + 1} / {totalSteps + 1}</span>
          </div>
          <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#00d4ff] to-cyan-300 transition-all"
              style={{ width: `${((stepIdx + 1) / (totalSteps + 1)) * 100}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === "welcome" && (
            <div className="space-y-5 max-w-lg mx-auto text-center py-6">
              <div className="w-16 h-16 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 mx-auto flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#00d4ff]" />
              </div>
              <h3 className="text-2xl font-bold text-white font-montserrat">
                Antes de agendar tu primera clase
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Necesitamos algunos datos para personalizar tu experiencia y asegurar que el
                entrenamiento sea seguro y efectivo para ti. Tomará solo 5 minutos.
              </p>
              <div className="space-y-2 text-left bg-[#0f131a] border border-white/10 rounded-lg p-4">
                <Item icon={<ClipboardList className="w-4 h-4" />}
                  text="Datos personales básicos (nombre, fecha de nacimiento, contacto)" />
                <Item icon={<ShieldCheck className="w-4 h-4" />}
                  text="Cuestionario PAR-Q de aptitud para actividad física" />
                <Item icon={<CheckCircle2 className="w-4 h-4" />}
                  text="Aceptación del consentimiento informado" />
              </div>
              <button onClick={() => setStep("profile")}
                className="px-6 py-2.5 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] text-sm font-bold transition flex items-center gap-2 mx-auto">
                Comenzar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === "profile" && (
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Completa tu perfil</h3>
              <p className="text-gray-400 text-sm mb-4">
                Llena las secciones marcadas con asterisco como mínimo. Las demás puedes completarlas después.
              </p>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-4 text-xs text-amber-200">
                <p className="font-semibold mb-1">📋 Pendiente completar:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {missing.map((f) => <li key={f}>{FIELD_LABELS[f] || f}</li>)}
                  {missing.length === 0 && <li>Todo listo ✓</li>}
                </ul>
              </div>
              <PatientForm patientId={userId} onSaved={async () => { await refresh(); }} onCancel={() => {}} />
              <div className="sticky bottom-0 bg-[#0a0e1a] py-3 flex justify-end gap-2 -mb-6 -mx-6 px-6 border-t border-white/10 mt-4">
                <button onClick={() => setStep("welcome")}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm transition">
                  Atrás
                </button>
                <button onClick={() => setStep("done")}
                  disabled={!allFilled}
                  className="px-4 py-2 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] text-sm font-bold transition disabled:opacity-40 flex items-center gap-2">
                  {allFilled ? "Continuar" : "Completa los datos pendientes"}
                  {allFilled && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-5 max-w-md mx-auto text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-white font-montserrat">¡Todo listo!</h3>
              <p className="text-gray-400 text-sm">
                Tu perfil está completo. Ya puedes agendar clases, explorar planes y empezar tu experiencia HTK.
              </p>
              <button onClick={handleMarkComplete} disabled={marking}
                className="px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition disabled:opacity-40 flex items-center gap-2 mx-auto">
                {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Empezar a usar HTK Center
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Item({ icon, text }: any) {
  return (
    <div className="flex items-start gap-2 text-gray-300 text-xs">
      <span className="text-[#00d4ff] mt-0.5">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

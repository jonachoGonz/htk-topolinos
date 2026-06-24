import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Save, Loader2, Plus, X, AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPatient,
  updatePatient,
  computeAge,
  createBodyEvaluation,
  type PatientProfile,
  type SportEntry,
  type SubstanceEntry,
  type MedicationEntry,
  type EmergencyContact,
} from "@/services/supabase";
import { isValidRut, formatRut, cleanRut } from "@/lib/rut";
import PhotoUploader from "./PhotoUploader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  EMPTY_BODY_EVAL_FORM,
  buildBodyEvaluationPayload,
  isBodyEvalFormEmpty,
  BodyEvaluationFormFields,
  type BodyEvalFormState,
} from "./BodyEvaluationFields";

// PAR-Q: Physical Activity Readiness Questionnaire (7 standard questions)
const PARQ_QUESTIONS = [
  { key: "q1", text: "¿Te ha dicho alguna vez tu médico que tienes una condición cardíaca y que solo debes realizar actividad física recomendada por un médico?" },
  { key: "q2", text: "¿Sientes dolor en el pecho cuando realizas actividad física?" },
  { key: "q3", text: "En el último mes, ¿has tenido dolor en el pecho cuando NO estabas realizando actividad física?" },
  { key: "q4", text: "¿Pierdes el equilibrio debido a mareos o alguna vez has perdido el conocimiento?" },
  { key: "q5", text: "¿Tienes algún problema óseo o articular que podría empeorar con un cambio en tu actividad física?" },
  { key: "q6", text: "¿Tu médico te está prescribiendo actualmente algún medicamento para la presión arterial o para una condición cardíaca?" },
  { key: "q7", text: "¿Conoces alguna otra razón por la cual no deberías hacer actividad física?" },
];

// List of common conditions (checkboxes)
const COMMON_DISEASES = [
  { key: "diabetes_t1", label: "Diabetes tipo 1" },
  { key: "diabetes_t2", label: "Diabetes tipo 2" },
  { key: "hipertension", label: "Hipertensión arterial" },
  { key: "asma", label: "Asma" },
  { key: "epilepsia", label: "Epilepsia" },
  { key: "cardio", label: "Cardiopatía / arritmia" },
  { key: "tiroides", label: "Trastorno tiroideo" },
  { key: "anemia", label: "Anemia" },
  { key: "artrosis", label: "Artrosis / artritis" },
  { key: "osteoporosis", label: "Osteoporosis" },
  { key: "fibromialgia", label: "Fibromialgia" },
  { key: "depresion", label: "Depresión" },
  { key: "ansiedad", label: "Ansiedad" },
  { key: "embarazo", label: "Embarazo" },
  { key: "lactancia", label: "Lactancia" },
  { key: "colon_irritable", label: "Colon irritable" },
  { key: "reflujo", label: "Reflujo gastroesofágico" },
  { key: "migraña", label: "Migraña crónica" },
  { key: "marcapasos", label: "Marcapasos / dispositivo" },
  { key: "cancer", label: "Cáncer (actual/remisión)" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);
// TODO: reemplazar con la URL real del documento de tratamiento de datos
// personales cuando el usuario la entregue.
const DATA_CONSENT_DOCUMENT_URL = "#";

interface PatientFormProps {
  patientId?: string; // if provided, edit mode
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}

const EMPTY: Partial<PatientProfile> = {
  full_name: "",
  email: "",
  rut_dni: "",
  birth_date: "",
  gender: "",
  marital_status: "",
  has_children: false,
  num_children: 0,
  joined_at: todayIso(),
  phone: "",
  address: "",
  address_number: "",
  comuna: "",
  profession: "",
  occupation: "",
  socio_number: "",
  social_media_handle: "",
  handedness: "",
  blood_type: "",
  health_center: "",
  allergies: "",
  diseases: [],
  diseases_other: "",
  surgeries: "",
  ailments: "",
  injuries: "",
  sports: [],
  drugs: [],
  medications: [],
  emergency_contacts: [],
  medical_info_extra: "",
  personal_info_extra: "",
  insurer: "",
  referral_source: "",
  informed_consent_signed: false,
  social_media_consent: false,
};

type SectionId =
  | "photo" | "personal" | "contact" | "professional" | "evaluation" | "parq" | "medical"
  | "conditions" | "sports" | "substances" | "emergency" | "extra" | "admin";

export default function PatientForm({ patientId, onSaved, onCancel }: PatientFormProps) {
  const [form, setForm] = useState<Partial<PatientProfile>>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    photo: true, personal: true, contact: true, professional: false,
    evaluation: false,
    parq: false, medical: false,
    conditions: false, sports: false, substances: false,
    emergency: false, extra: false, admin: false,
  });
  const [rutTouched, setRutTouched] = useState(false);
  const { user } = useAuth();
  const [evalForm, setEvalForm] = useState<BodyEvalFormState>(EMPTY_BODY_EVAL_FORM);

  useEffect(() => {
    if (patientId) {
      setLoading(true);
      getPatient(patientId).then((res) => {
        if (res.success && res.data) setForm({ ...EMPTY, ...res.data });
        else toast.error(`Error: ${res.error}`);
        setLoading(false);
      });
    }
  }, [patientId]);

  const set = <K extends keyof PatientProfile>(k: K, v: PatientProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const toggle = (id: SectionId) => setOpen((o) => ({ ...o, [id]: !o[id] }));

  const age = computeAge(form.birth_date as string | undefined);

  const rutValid = !form.rut_dni || isValidRut(form.rut_dni);

  // PAR-Q helpers
  const parqAnswers = (form.parq_answers || {}) as Record<string, boolean>;
  const allParqAnswered = PARQ_QUESTIONS.every((q) => q.key in parqAnswers);
  const parqHasAnyYes = Object.values(parqAnswers).some((v) => v === true);
  const parqClearedComputed = allParqAnswered && !parqHasAnyYes;
  const setParq = (k: string, v: boolean) => {
    const next = { ...parqAnswers, [k]: v };
    set("parq_answers", next as any);
    // Auto-update cleared flag if all 7 answered
    if (PARQ_QUESTIONS.every((q) => q.key in next)) {
      set("parq_cleared", !Object.values(next).some((x) => x === true) as any);
      set("parq_completed_at", new Date().toISOString() as any);
    }
  };

  const toggleDisease = (k: string) =>
    set("diseases", (form.diseases || []).includes(k)
      ? (form.diseases || []).filter((d) => d !== k)
      : [...(form.diseases || []), k]);

  const addRow = <T,>(field: "sports" | "drugs" | "medications" | "emergency_contacts", row: T) => {
    const arr: any[] = (form as any)[field] || [];
    set(field as any, [...arr, row] as any);
  };
  const removeRow = (field: "sports" | "drugs" | "medications" | "emergency_contacts", idx: number) => {
    const arr: any[] = (form as any)[field] || [];
    set(field as any, arr.filter((_, i) => i !== idx) as any);
  };
  const updateRow = (field: "sports" | "drugs" | "medications" | "emergency_contacts", idx: number, patch: any) => {
    const arr: any[] = (form as any)[field] || [];
    set(field as any, arr.map((r, i) => (i === idx ? { ...r, ...patch } : r)) as any);
  };

  const handleSave = async () => {
    if (!form.full_name?.trim()) {
      toast.error("Nombre completo es requerido");
      setOpen((o) => ({ ...o, personal: true }));
      return;
    }
    if (form.rut_dni && !isValidRut(form.rut_dni)) {
      toast.error("RUT inválido (revisa formato y dígito verificador)");
      setOpen((o) => ({ ...o, personal: true }));
      return;
    }
    // Normalize RUT to "12.345.678-9" before saving
    if (form.rut_dni && isValidRut(form.rut_dni)) {
      form.rut_dni = formatRut(form.rut_dni);
    }
    setSaving(true);
    if (patientId) {
      const res = await updatePatient(patientId, form);
      if (res.success) {
        toast.success("Paciente actualizado");
        if (!isBodyEvalFormEmpty(evalForm)) {
          const evalRes = await createBodyEvaluation({
            patient_id: patientId,
            professional_id: user?.id ?? null,
            ...buildBodyEvaluationPayload(evalForm),
          });
          if (evalRes.success) {
            toast.success("Evaluación inicial registrada");
            setEvalForm(EMPTY_BODY_EVAL_FORM);
          } else {
            toast.error(`La evaluación inicial no se pudo guardar: ${evalRes.error}`);
          }
        }
        // Await aquí es clave: el wizard de onboarding usa onSaved para
        // refrescar su estado y decidir si puede avanzar al siguiente paso.
        // Sin await, el wizard quedaba con el botón "Completa los datos
        // pendientes" aunque la DB ya tuviera todo OK.
        try {
          await onSaved();
        } catch (e) {
          console.error("PatientForm onSaved error:", e);
        }
      } else toast.error(`Error: ${res.error}`);
    } else {
      // Create flow: requires the student to already exist in auth.users
      toast.error(
        "Para crear un paciente nuevo, primero debe registrarse desde /login (signup). Luego edita su perfil aquí."
      );
    }
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
    <div className="space-y-3">
      <Tabs defaultValue="perfil" className="space-y-3">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="salud">Salud</TabsTrigger>
          <TabsTrigger value="evaluacion">Evaluación inicial</TabsTrigger>
          <TabsTrigger value="administrativo">Administrativo</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-3">
          {patientId && (
            <Section id="photo" title="Foto del paciente" open={open.photo} onToggle={toggle}>
              <PhotoUploader
                patientId={patientId}
                currentUrl={form.photo_url}
                onChange={(url) => set("photo_url", url as any)}
              />
            </Section>
          )}

          <Section id="personal" title="Datos personales" open={open.personal} onToggle={toggle}>
            <Grid>
              <Field label="Nombre completo *"><Input value={form.full_name || ""} onChange={(v) => set("full_name", v)} /></Field>
              <Field label="RUT / DNI">
                <Input
                  value={form.rut_dni || ""}
                  onChange={(v) => { set("rut_dni", v); setRutTouched(true); }}
                  onBlur={() => {
                    if (form.rut_dni && isValidRut(form.rut_dni)) {
                      set("rut_dni", formatRut(form.rut_dni));
                    }
                  }}
                  placeholder="12.345.678-9"
                />
                {rutTouched && form.rut_dni && !rutValid && (
                  <p className="text-[10px] text-red-400 mt-1">RUT inválido (verifica formato y dígito)</p>
                )}
                {rutTouched && form.rut_dni && rutValid && (
                  <p className="text-[10px] text-emerald-400 mt-1">RUT válido ✓</p>
                )}
              </Field>
              <Field label="N° de socio">
                <div className="flex items-center gap-2">
                  <Input value={form.socio_number || "—"} disabled className="flex-1" />
                  {form.socio_number && (
                    <button type="button"
                      onClick={() => { navigator.clipboard.writeText(form.socio_number || ""); toast.success("Copiado"); }}
                      className="p-2 rounded-lg bg-white/[0.05] border border-white/10 text-gray-400 hover:text-white transition shrink-0"
                      title="Copiar">
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Field>
              <Field label="Fecha de nacimiento">
                <Input type="date" value={form.birth_date || ""} onChange={(v) => set("birth_date", v)} />
              </Field>
              <Field label="Edad">
                <Input value={age != null ? `${age} años` : "—"} disabled />
              </Field>
              <Field label="Fecha de ingreso">
                <Input type="date" value={(form.joined_at || "").slice(0, 10) || todayIso()} onChange={(v) => set("joined_at", v)} />
              </Field>
              <Field label="Género">
                <Select value={form.gender || ""} onChange={(v) => set("gender", v)}
                  options={[["", "—"], ["M", "Masculino"], ["F", "Femenino"], ["X", "Otro / Prefiere no decir"]]} />
              </Field>
              <Field label="Estado civil">
                <Select value={form.marital_status || ""} onChange={(v) => set("marital_status", v as any)}
                  options={[["", "—"], ["soltero", "Soltero/a"], ["casado", "Casado/a"], ["conviviente", "Conviviente"], ["divorciado", "Divorciado/a"], ["viudo", "Viudo/a"], ["otro", "Otro"]]} />
              </Field>
              <Field label="Hijos">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-white whitespace-nowrap">
                    <input type="checkbox" checked={!!form.has_children}
                      onChange={(e) => set("has_children", e.target.checked)} />
                    Sí
                  </label>
                  {form.has_children && (
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1">Número de hijos</label>
                      <Input type="number" value={String(form.num_children ?? 0)}
                        onChange={(v) => set("num_children", parseInt(v) || 0)} />
                    </div>
                  )}
                </div>
              </Field>
              <Field label="Lateralidad">
                <Select value={form.handedness || ""} onChange={(v) => set("handedness", v as any)}
                  options={[["", "—"], ["diestro", "Diestro"], ["zurdo", "Zurdo"], ["ambidiestro", "Ambidiestro"]]} />
              </Field>
            </Grid>
          </Section>

          <Section id="contact" title="Contacto" open={open.contact} onToggle={toggle}>
            <Grid>
              <Field label="Email"><Input type="email" value={form.email || ""} onChange={(v) => set("email", v)} /></Field>
              <Field label="Teléfono"><Input value={form.phone || ""} onChange={(v) => set("phone", v)} /></Field>
              <Field label="Dirección"><Input value={form.address || ""} onChange={(v) => set("address", v)} placeholder="Calle" /></Field>
              <Field label="N° casa / depto"><Input value={form.address_number || ""} onChange={(v) => set("address_number", v)} /></Field>
              <Field label="Comuna"><Input value={form.comuna || ""} onChange={(v) => set("comuna", v)} /></Field>
              <Field label="@Redes sociales"><Input value={form.social_media_handle || ""} onChange={(v) => set("social_media_handle", v)} placeholder="@usuario" /></Field>
            </Grid>
          </Section>

          <Section id="emergency" title="Contacto de emergencia" open={open.emergency} onToggle={toggle}>
            <RepeatRows
              items={(form.emergency_contacts as EmergencyContact[]) || []}
              onAdd={() => addRow<EmergencyContact>("emergency_contacts", { name: "", phone: "", relation: "" })}
              onRemove={(i) => removeRow("emergency_contacts", i)}
              render={(row, i) => (
                <>
                  <Input value={row.name} onChange={(v) => updateRow("emergency_contacts", i, { name: v })} placeholder="Nombre" className="flex-1 min-w-[140px]" />
                  <Input value={row.phone || ""} onChange={(v) => updateRow("emergency_contacts", i, { phone: v })} placeholder="Teléfono" className="w-36" />
                  <Input value={row.relation || ""} onChange={(v) => updateRow("emergency_contacts", i, { relation: v })} placeholder="Padre, pareja, amigo…" className="w-44" />
                </>
              )} />
          </Section>

          <Section id="professional" title="Datos profesionales" open={open.professional} onToggle={toggle}>
            <Grid>
              <Field label="Profesión"><Input value={form.profession || ""} onChange={(v) => set("profession", v)} /></Field>
              <Field label="Labor actual"><Input value={form.occupation || ""} onChange={(v) => set("occupation", v)} /></Field>
            </Grid>
          </Section>
        </TabsContent>

        <TabsContent value="salud" className="space-y-3">
          <Section id="parq" title="PAR-Q (Cuestionario de aptitud para actividad física)" open={open.parq} onToggle={toggle}>
            <p className="text-xs text-gray-400 mb-3">
              Cuestionario estándar internacional. Responde con honestidad — si marcas <strong>SÍ</strong> en
              alguna pregunta, recomendamos consultar con un médico antes de iniciar entrenamiento.
            </p>
            <div className="space-y-2">
              {PARQ_QUESTIONS.map((q, idx) => {
                const ans = parqAnswers[q.key];
                return (
                  <div
                    key={q.key}
                    className={`p-3 rounded-lg border ${
                      ans === true
                        ? "bg-red-500/10 border-red-500/20"
                        : ans === false
                        ? "bg-emerald-500/5 border-emerald-500/15"
                        : "bg-[#0f131a] border-white/10"
                    }`}
                  >
                    <p className="text-xs text-white mb-2">
                      <span className="text-gray-500 mr-1">{idx + 1}.</span>
                      {q.text}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setParq(q.key, true)}
                        className={`flex-1 py-1.5 rounded text-xs font-semibold transition ${
                          ans === true
                            ? "bg-red-500 text-white"
                            : "bg-white/[0.05] text-gray-400 hover:text-white"
                        }`}
                      >
                        SÍ
                      </button>
                      <button
                        type="button"
                        onClick={() => setParq(q.key, false)}
                        className={`flex-1 py-1.5 rounded text-xs font-semibold transition ${
                          ans === false
                            ? "bg-emerald-500 text-white"
                            : "bg-white/[0.05] text-gray-400 hover:text-white"
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {allParqAnswered && (
              <div
                className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
                  parqClearedComputed
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-200"
                    : "bg-red-500/10 border border-red-500/20 text-red-200"
                }`}
              >
                {parqClearedComputed ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-xs font-semibold">
                    {parqClearedComputed
                      ? "✓ Apto para iniciar actividad física"
                      : "⚠ Requiere autorización médica antes de entrenar"}
                  </p>
                  <p className="text-[10px] mt-0.5 opacity-80">
                    Completado: {form.parq_completed_at ? new Date(form.parq_completed_at).toLocaleString() : "ahora"}
                  </p>
                </div>
              </div>
            )}

            {allParqAnswered && !parqClearedComputed && (
              <div className="mt-3">
                <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                  Notas de autorización médica (si aplica)
                </label>
                <Textarea
                  value={form.parq_clearance_notes || ""}
                  onChange={(v: string) => set("parq_clearance_notes", v)}
                  rows={2}
                  placeholder="Ej: Médico tratante autorizó actividad de bajo impacto. Documento adjunto en archivos."
                />
              </div>
            )}
          </Section>

          <Section id="medical" title="Datos médicos básicos" open={open.medical} onToggle={toggle}>
            <Grid>
              <Field label="Tipo de sangre">
                <Select value={form.blood_type || ""} onChange={(v) => set("blood_type", v as any)}
                  options={[["", "—"], ["A+", "A+"], ["A-", "A-"], ["B+", "B+"], ["B-", "B-"], ["AB+", "AB+"], ["AB-", "AB-"], ["O+", "O+"], ["O-", "O-"]]} />
              </Field>
              <Field label="Aseguradora">
                <Select value={form.insurer || ""} onChange={(v) => set("insurer", v)}
                  options={[["", "—"], ["Fonasa", "Fonasa"], ["Isapre", "Isapre"], ["Particular", "Particular"], ["Otro", "Otro"]]} />
              </Field>
              <Field label="Centro de salud al cual acudir"><Input value={form.health_center || ""} onChange={(v) => set("health_center", v)} /></Field>
              <Field label="Alergias" full><Textarea value={form.allergies || ""} onChange={(v) => set("allergies", v)} rows={2} /></Field>
              <Field label="Cirugías" full><Textarea value={form.surgeries || ""} onChange={(v) => set("surgeries", v)} rows={2} placeholder="Tipo, fecha aprox., complicaciones..." /></Field>
              <Field label="Dolencias actuales" full><Textarea value={form.ailments || ""} onChange={(v) => set("ailments", v)} rows={2} /></Field>
              <Field label="Lesiones (actuales/pasadas)" full><Textarea value={form.injuries || ""} onChange={(v) => set("injuries", v)} rows={2} /></Field>
            </Grid>
          </Section>

          <Section id="conditions" title="Enfermedades / condiciones a considerar" open={open.conditions} onToggle={toggle}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COMMON_DISEASES.map((d) => {
                const checked = (form.diseases || []).includes(d.key);
                return (
                  <label key={d.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                      checked ? "bg-rose-500/10 border-rose-500/30 text-rose-200" : "bg-[#0f131a] border-white/10 text-gray-400 hover:text-white"
                    }`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleDisease(d.key)} />
                    <span className="text-xs">{d.label}</span>
                  </label>
                );
              })}
              <label
                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                  (form.diseases || []).includes("otra") ? "bg-rose-500/10 border-rose-500/30 text-rose-200" : "bg-[#0f131a] border-white/10 text-gray-400 hover:text-white"
                }`}>
                <input type="checkbox" checked={(form.diseases || []).includes("otra")} onChange={() => toggleDisease("otra")} />
                <span className="text-xs">Otra</span>
              </label>
            </div>
            {(form.diseases || []).includes("otra") && (
              <div className="mt-3">
                <Field label="Especificar" full>
                  <Input value={form.diseases_other || ""} onChange={(v) => set("diseases_other", v)} />
                </Field>
              </div>
            )}
          </Section>

          <Section id="substances" title="Medicamentos y sustancias" open={open.substances} onToggle={toggle}>
            <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Medicamentos</p>
            <RepeatRows
              items={(form.medications as MedicationEntry[]) || []}
              onAdd={() => addRow<MedicationEntry>("medications", { name: "", dose: "", frequency: "", since: "" })}
              onRemove={(i) => removeRow("medications", i)}
              render={(row, i) => (
                <>
                  <Input value={row.name} onChange={(v) => updateRow("medications", i, { name: v })} placeholder="Medicamento" className="flex-1 min-w-[140px]" />
                  <Input value={row.dose || ""} onChange={(v) => updateRow("medications", i, { dose: v })} placeholder="Dosis" className="w-28" />
                  <Input value={row.frequency || ""} onChange={(v) => updateRow("medications", i, { frequency: v })} placeholder="Frecuencia" className="w-32" />
                  <Input value={row.since || ""} onChange={(v) => updateRow("medications", i, { since: v })} placeholder="Desde" className="w-28" />
                </>
              )} />
            <p className="text-xs text-gray-500 mt-4 mb-2 font-semibold uppercase">Drogas / sustancias recreativas</p>
            <RepeatRows
              items={(form.drugs as SubstanceEntry[]) || []}
              onAdd={() => addRow<SubstanceEntry>("drugs", { name: "", frequency: "", since: "" })}
              onRemove={(i) => removeRow("drugs", i)}
              render={(row, i) => (
                <>
                  <Input value={row.name} onChange={(v) => updateRow("drugs", i, { name: v })} placeholder="Sustancia" className="flex-1 min-w-[140px]" />
                  <Input value={row.frequency || ""} onChange={(v) => updateRow("drugs", i, { frequency: v })} placeholder="Frecuencia" className="w-32" />
                  <Input value={row.since || ""} onChange={(v) => updateRow("drugs", i, { since: v })} placeholder="Desde" className="w-28" />
                </>
              )} />
          </Section>

          <Section id="sports" title="Deportes que practica" open={open.sports} onToggle={toggle}>
            <RepeatRows
              items={(form.sports as SportEntry[]) || []}
              onAdd={() => addRow<SportEntry>("sports", { name: "", since: "", frequency_per_week: undefined })}
              onRemove={(i) => removeRow("sports", i)}
              render={(row, i) => (
                <>
                  <Input value={row.name} onChange={(v) => updateRow("sports", i, { name: v })} placeholder="Deporte" className="flex-1 min-w-[140px]" />
                  <Input value={row.since || ""} onChange={(v) => updateRow("sports", i, { since: v })} placeholder="Desde (YYYY)" className="w-32" />
                  <Input type="number" value={String(row.frequency_per_week ?? "")} onChange={(v) => updateRow("sports", i, { frequency_per_week: parseInt(v) || undefined })} placeholder="x/sem" className="w-24" />
                </>
              )} />
          </Section>
        </TabsContent>

        <TabsContent value="evaluacion" className="space-y-3">
          <Section id="evaluation" title="Evaluación inicial (opcional)" open={open.evaluation} onToggle={toggle}>
            <p className="text-xs text-gray-400 mb-3">
              Si estás creando o editando este perfil durante una evaluación presencial, puedes
              registrar los datos aquí mismo. No es obligatorio: si lo dejas vacío, no se crea
              ningún registro en el historial de evaluaciones.
            </p>
            <BodyEvaluationFormFields form={evalForm} onChange={setEvalForm} />
          </Section>
        </TabsContent>

        <TabsContent value="administrativo" className="space-y-3">
          <Section id="extra" title="Información adicional" open={open.extra} onToggle={toggle}>
            <Grid>
              <Field label="Información médica extra importante" full>
                <Textarea value={form.medical_info_extra || ""} onChange={(v) => set("medical_info_extra", v)} rows={3} />
              </Field>
              <Field label="Información personal importante" full>
                <Textarea value={form.personal_info_extra || ""} onChange={(v) => set("personal_info_extra", v)} rows={3} />
              </Field>
            </Grid>
          </Section>

          <Section id="admin" title="Datos administrativos" open={open.admin} onToggle={toggle}>
            <Grid>
              <Field label="Cómo nos conoció">
                <Select value={form.referral_source || ""} onChange={(v) => set("referral_source", v)}
                  options={[["", "—"], ["instagram", "Instagram"], ["facebook", "Facebook"], ["google", "Google"], ["referido", "Referido por otro alumno"], ["medico", "Recomendación médica"], ["otro", "Otro"]]} />
              </Field>
              <Field label="Consentimiento de datos personales" full>
                <div className="space-y-2">
                  <a href={DATA_CONSENT_DOCUMENT_URL} target="_blank" rel="noreferrer"
                    className="text-xs text-[#00d4ff] underline inline-block">
                    Ver documento de tratamiento de datos personales
                  </a>
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input type="checkbox" checked={!!form.informed_consent_signed}
                      onChange={(e) => set("informed_consent_signed", e.target.checked)} />
                    Acepto el tratamiento de mis datos personales
                  </label>
                </div>
              </Field>
              <Field label="Consentimiento redes sociales">
                <label className="flex items-center gap-2 text-sm text-white">
                  <input type="checkbox" checked={!!form.social_media_consent}
                    onChange={(e) => set("social_media_consent", e.target.checked)} />
                  Autoriza ser etiquetado en publicaciones
                </label>
              </Field>
            </Grid>
          </Section>
        </TabsContent>
      </Tabs>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 bg-[#0a0e1a] border-t border-white/10 p-3 flex justify-end gap-2 -mx-6 -mb-6 mt-4 px-6">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.08] transition">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] text-sm font-bold font-lexend transition flex items-center gap-2 disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar
        </button>
      </div>
    </div>
  );
}

// ----- helpers -----
function Section({ id, title, open, onToggle, children }: any) {
  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
      <button onClick={() => onToggle(id)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition">
        <span className="text-white font-semibold font-lexend text-sm">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4 border-t border-white/[0.04]">{children}</div>}
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
function Input({ value, onChange, onBlur, type = "text", placeholder, className = "", disabled }: any) {
  return (
    <input type={type} value={value} disabled={disabled} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className={`w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40 disabled:opacity-50 ${className}`} />
  );
}
function Textarea({ value, onChange, rows = 3, placeholder }: any) {
  return (
    <textarea value={value} rows={rows} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40" />
  );
}
function Select({ value, onChange, options }: any) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40">
      {options.map(([v, l]: [string, string]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}
function RepeatRows<T>({ items, onAdd, onRemove, render }: {
  items: T[]; onAdd: () => void; onRemove: (i: number) => void;
  render: (row: T, i: number) => any;
}) {
  return (
    <div className="space-y-2">
      {items.map((row, i) => (
        <div key={i} className="flex gap-2 items-start">
          <div className="flex flex-1 flex-wrap gap-2">{render(row, i)}</div>
          <button type="button" onClick={() => onRemove(i)}
            className="shrink-0 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={onAdd}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs font-semibold hover:bg-white/[0.08] transition">
        <Plus className="w-3.5 h-3.5" /> Agregar
      </button>
    </div>
  );
}

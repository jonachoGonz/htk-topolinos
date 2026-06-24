# Migración de modal a página completa: detalle de alumno y profesor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar `PatientDetailModal.tsx`/`TeacherDetailModal.tsx` por páginas completas (`/dashboard/patients/:id`, `/dashboard/teachers/:id`), resolviendo el scroll infinito de `PatientForm.tsx` agrupando sus 13 secciones en 4 sub-tabs, y agregando aviso de cambios sin guardar al intentar salir.

**Architecture:** Dos páginas nuevas en `client/pages/` que mantienen el mismo chrome de dashboard (`Sidebar`/`DashboardTopBar`/`BottomNav`) que el resto de rutas `/dashboard/*`. Los paneles internos del modal de alumno (Notas/Asistencia/Pausar/Profesionales) se extraen tal cual a un archivo compartido. `PatientForm.tsx` y `TeacherProfileForm.tsx` ganan un prop opcional `onDirtyChange` para que la página padre pueda interceptar la navegación si hay cambios sin guardar.

**Tech Stack:** React + TypeScript, react-router-dom (`useParams`, `useSearchParams`, `useNavigate`), Radix Tabs (`@/components/ui/tabs`, ya usado en `AdminPanel.tsx`).

Spec completo: `docs/superpowers/specs/2026-06-23-patient-teacher-detail-pages-design.md`.

---

### Task 1: Agrupar las 13 secciones de `PatientForm.tsx` en 4 sub-tabs

**Files:**
- Modify: `client/components/dashboard/PatientForm.tsx`

- [ ] **Step 1: Agregar el import de Tabs**

Cambiar el import de `PhotoUploader` (línea 17) agregando justo debajo:

```tsx
import PhotoUploader from "./PhotoUploader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
```

- [ ] **Step 2: Reemplazar el bloque de secciones por la versión con sub-tabs**

Reemplazar TODO el bloque desde `return (` (línea 242) hasta el cierre de la sección
`admin` (línea 591, justo antes de `{/* Sticky save bar */}`) por:

```tsx
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

```

Inmediatamente después de este bloque sigue (sin cambios) el comentario `{/* Sticky save bar */}`
y todo lo que ya existía desde ahí hasta el final del componente — no tocar esa parte.

- [ ] **Step 3: Verificar que el proyecto compila**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run typecheck`
Expected: sin errores nuevos relacionados a `PatientForm.tsx`.

- [ ] **Step 4: Commit**

```bash
git add client/components/dashboard/PatientForm.tsx
git commit -m "refactor(patient-form): group 13 sections into 4 sub-tabs (Perfil/Salud/Evaluación inicial/Administrativo)"
```

---

### Task 2: `onDirtyChange` en `PatientForm.tsx`

**Files:**
- Modify: `client/components/dashboard/PatientForm.tsx`

- [ ] **Step 1: Importar `useRef`**

Cambiar la línea 1:

```tsx
import { useState, useEffect } from "react";
```

por:

```tsx
import { useState, useEffect, useRef } from "react";
```

- [ ] **Step 2: Agregar el prop `onDirtyChange` a la interfaz**

Cambiar:

```tsx
interface PatientFormProps {
  patientId?: string; // if provided, edit mode
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}
```

por:

```tsx
interface PatientFormProps {
  patientId?: string; // if provided, edit mode
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}
```

y la firma del componente de:

```tsx
export default function PatientForm({ patientId, onSaved, onCancel }: PatientFormProps) {
```

a:

```tsx
export default function PatientForm({ patientId, onSaved, onCancel, onDirtyChange }: PatientFormProps) {
```

- [ ] **Step 3: Agregar el snapshot ref y el efecto de dirty-tracking**

Inmediatamente después de la línea `const [evalForm, setEvalForm] = useState<BodyEvalFormState>(EMPTY_BODY_EVAL_FORM);`,
agregar:

```tsx
  const savedSnapshotRef = useRef<{ form: Partial<PatientProfile>; evalForm: BodyEvalFormState }>({
    form: EMPTY,
    evalForm: EMPTY_BODY_EVAL_FORM,
  });
  const lastDirtyRef = useRef(false);
```

Reemplazar el `useEffect` de carga (el que llama a `getPatient`):

```tsx
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
```

por:

```tsx
  useEffect(() => {
    if (patientId) {
      setLoading(true);
      getPatient(patientId).then((res) => {
        if (res.success && res.data) {
          const loaded = { ...EMPTY, ...res.data };
          setForm(loaded);
          savedSnapshotRef.current = { form: loaded, evalForm: EMPTY_BODY_EVAL_FORM };
        } else toast.error(`Error: ${res.error}`);
        setLoading(false);
      });
    }
  }, [patientId]);

  useEffect(() => {
    const dirty =
      JSON.stringify(form) !== JSON.stringify(savedSnapshotRef.current.form) ||
      JSON.stringify(evalForm) !== JSON.stringify(savedSnapshotRef.current.evalForm);
    if (dirty !== lastDirtyRef.current) {
      lastDirtyRef.current = dirty;
      onDirtyChange?.(dirty);
    }
  }, [form, evalForm, onDirtyChange]);
```

- [ ] **Step 4: Resetear el snapshot tras guardar con éxito**

En `handleSave`, dentro del bloque `if (res.success) {` (rama `patientId` existente),
inmediatamente después de la línea `toast.success("Paciente actualizado");`, agregar:

```tsx
        toast.success("Paciente actualizado");
        savedSnapshotRef.current = { form, evalForm: EMPTY_BODY_EVAL_FORM };
        lastDirtyRef.current = false;
        onDirtyChange?.(false);
```

(El resto de `handleSave` —el bloque de `createBodyEvaluation` y el `await onSaved()`— sigue
exactamente igual, sin cambios.)

- [ ] **Step 5: Verificar que el proyecto compila**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run typecheck`
Expected: sin errores nuevos.

- [ ] **Step 6: Commit**

```bash
git add client/components/dashboard/PatientForm.tsx
git commit -m "feat(patient-form): add onDirtyChange prop for unsaved-changes tracking"
```

---

### Task 3: `onDirtyChange` en `TeacherProfileForm.tsx`

**Files:**
- Modify: `client/components/dashboard/TeacherProfileForm.tsx`

- [ ] **Step 1: Importar `useRef` y agregar el prop**

Cambiar la línea 1:

```tsx
import { useEffect, useState } from "react";
```

por:

```tsx
import { useEffect, useState, useRef } from "react";
```

Cambiar la interfaz (líneas 10-12):

```tsx
interface TeacherProfileFormProps {
  teacherId: string;
}
```

por:

```tsx
interface TeacherProfileFormProps {
  teacherId: string;
  onDirtyChange?: (dirty: boolean) => void;
}
```

y la firma del componente:

```tsx
export default function TeacherProfileForm({ teacherId }: TeacherProfileFormProps) {
```

por:

```tsx
export default function TeacherProfileForm({ teacherId, onDirtyChange }: TeacherProfileFormProps) {
```

- [ ] **Step 2: Agregar el snapshot ref y el dirty-tracking**

Inmediatamente después de `const [newSpecialty, setNewSpecialty] = useState("");`, agregar:

```tsx
  const savedSnapshotRef = useRef<Partial<TeacherProfile>>({});
  const lastDirtyRef = useRef(false);
```

Reemplazar el `useEffect` de carga:

```tsx
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
      setForm({
        ...(profile ?? {}),
        // prefer the profile.email if explicitly set, fall back to auth.users
        email: profile?.email || authEmail || "",
      });
      setLoading(false);
    });
  }, [teacherId]);
```

por:

```tsx
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
```

- [ ] **Step 3: Resetear el snapshot tras guardar con éxito**

Cambiar `handleSave`:

```tsx
  const handleSave = async () => {
    if (!form.full_name?.trim()) {
      toast.error("Nombre es requerido");
      return;
    }
    setSaving(true);
    const r = await updateTeacherProfile(teacherId, form);
    if (r.success) toast.success("Perfil guardado");
    else toast.error(`Error: ${r.error}`);
    setSaving(false);
  };
```

por:

```tsx
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
```

- [ ] **Step 4: Verificar que el proyecto compila**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run typecheck`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add client/components/dashboard/TeacherProfileForm.tsx
git commit -m "feat(teacher-profile-form): add onDirtyChange prop for unsaved-changes tracking"
```

---

### Task 4: Extraer los paneles de `PatientDetailModal.tsx` a un archivo compartido

**Files:**
- Create: `client/components/dashboard/patient-detail/panels.tsx`

- [ ] **Step 1: Crear el archivo con los paneles extraídos tal cual**

```tsx
import { useEffect, useState } from "react";
import { StickyNote, Pause, Play, Trash2, Pin, Plus, Loader2, Briefcase, X } from "lucide-react";
import { toast } from "sonner";
import {
  getPatientNotes, addPatientNote, deletePatientNote,
  setPatientPause, getPatientAttendance,
  getAllPatients, listProfessionalsForStudent,
  assignProfessionalToStudent, removeProfessionalFromStudent,
  type PatientNote, type PatientAttendance, type PatientProfile,
} from "@/services/supabase";

export const CRITICAL_KEYS = new Set([
  "diabetes_t1", "epilepsia", "cardio", "marcapasos", "embarazo", "cancer",
]);
export const CRITICAL_LABELS: Record<string, string> = {
  diabetes_t1: "Diabetes T1",
  epilepsia: "Epilepsia",
  cardio: "Cardiopatía",
  marcapasos: "Marcapasos",
  embarazo: "Embarazo",
  cancer: "Cáncer",
};

export function NotesPanel({ patientId }: { patientId: string }) {
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    const r = await getPatientNotes(patientId);
    if (r.success) setNotes(r.data || []);
  };
  useEffect(() => { fetch(); }, [patientId]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setLoading(true);
    const r = await addPatientNote(patientId, content.trim(), pinned);
    if (r.success) { setContent(""); setPinned(false); fetch(); toast.success("Nota agregada"); }
    else toast.error(`Error: ${r.error}`);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta nota?")) return;
    const r = await deletePatientNote(id);
    if (r.success) { fetch(); toast.success("Nota eliminada"); }
    else toast.error(`Error: ${r.error}`);
  };

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">
        🔒 Solo visible para profesores y administradores. El paciente no ve estas notas.
      </div>

      <div className="bg-[#0f131a] border border-white/10 rounded-lg p-3 space-y-2">
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3}
          placeholder="Escribe una nota sobre el paciente…"
          className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            <Pin className="w-3 h-3" /> Fijar
          </label>
          <button onClick={handleAdd} disabled={loading || !content.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] rounded-lg text-xs font-bold transition disabled:opacity-40">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Agregar nota
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-6">Sin notas aún.</p>
      ) : (
        notes.map((n) => (
          <div key={n.id} className={`p-3 rounded-lg border ${
            n.is_pinned ? "bg-amber-500/5 border-amber-500/20" : "bg-[#0f131a] border-white/10"
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-white text-sm whitespace-pre-wrap">{n.content}</p>
                <p className="text-[10px] text-gray-500 mt-2">
                  {n.author?.full_name || "—"} • {new Date(n.created_at).toLocaleString()}
                  {n.is_pinned && <span className="ml-2 text-amber-400"><Pin className="inline w-3 h-3" /> fijada</span>}
                </p>
              </div>
              <button onClick={() => handleDelete(n.id)}
                className="text-red-400 hover:bg-red-500/10 p-1.5 rounded transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function AttendancePanel({ patientId }: { patientId: string }) {
  const [stats, setStats] = useState<PatientAttendance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatientAttendance(patientId).then((r) => {
      if (r.success) setStats(r.data || null);
      setLoading(false);
    });
  }, [patientId]);

  if (loading) return <p className="text-center text-gray-500 py-6">Cargando…</p>;
  if (!stats) return <p className="text-center text-gray-500 py-6">Sin datos de asistencia aún.</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Sesiones agendadas" value={String(stats.confirmed_count ?? 0)} />
      <Stat label="Asistió" value={String(stats.attended_count ?? 0)} color="text-emerald-400" />
      <Stat label="Ausente" value={String(stats.absent_count ?? 0)} color="text-red-400" />
      <Stat label="Tasa asistencia" value={stats.attendance_rate_pct != null ? `${stats.attendance_rate_pct}%` : "—"} color="text-[#00d4ff]" />
      <Stat label="Última asistencia" value={stats.last_attended_session ? new Date(stats.last_attended_session).toLocaleString() : "—"} full />
      <Stat label="Próxima clase" value={stats.last_scheduled_session ? new Date(stats.last_scheduled_session).toLocaleString() : "—"} full />
    </div>
  );
}

function Stat({ label, value, color = "text-white", full = false }: any) {
  return (
    <div className={`p-3 rounded-lg bg-[#0f131a] border border-white/10 ${full ? "col-span-2 md:col-span-4" : ""}`}>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className={`text-lg font-bold font-montserrat mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export function PausePanel({ patientId, isPaused, onChanged }: { patientId: string; isPaused: boolean; onChanged: () => void }) {
  const [reason, setReason] = useState("");
  const [resumeAt, setResumeAt] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const r = await setPatientPause(patientId, !isPaused, reason || undefined, resumeAt || undefined);
    if (r.success) {
      toast.success(isPaused ? "Paciente reanudado" : "Paciente pausado");
      onChanged();
    } else toast.error(`Error: ${r.error}`);
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className={`p-4 rounded-lg ${
        isPaused ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-200"
                 : "bg-amber-500/10 border border-amber-500/20 text-amber-200"
      }`}>
        {isPaused
          ? "Al reanudar, se reactivará el último plan activo si no ha expirado."
          : "Al pausar, se desactiva el plan activo del alumno. No podrá agendar nuevas clases hasta reanudar."}
      </div>

      {!isPaused && (
        <>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
              Motivo (opcional)
            </label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="Ej: lesión, viaje, decisión personal…"
              className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
              Fecha estimada de reanudación (opcional)
            </label>
            <input type="date" value={resumeAt} onChange={(e) => setResumeAt(e.target.value)}
              className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
          </div>
        </>
      )}

      <button onClick={handleSubmit} disabled={loading}
        className={`w-full py-2.5 rounded-lg font-bold font-lexend transition disabled:opacity-40 flex items-center justify-center gap-2 ${
          isPaused ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                   : "bg-amber-500 hover:bg-amber-400 text-[#05050A]"
        }`}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" />
          : isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        {isPaused ? "Reanudar paciente" : "Pausar paciente"}
      </button>
    </div>
  );
}

export function ProfessionalsPanel({ patientId }: { patientId: string }) {
  const [assigned, setAssigned] = useState<Array<{
    professional_id: string;
    full_name?: string;
    professional_type?: string | null;
    assigned_at: string;
  }>>([]);
  const [allTeachers, setAllTeachers] = useState<PatientProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [aRes, tRes] = await Promise.all([
      listProfessionalsForStudent(patientId),
      getAllPatients("teacher"),
    ]);
    if (aRes.success) setAssigned(aRes.data || []);
    if (tRes.success) setAllTeachers(tRes.data || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [patientId]);

  const assignedIds = new Set(assigned.map((a) => a.professional_id));
  const available = allTeachers.filter((t) => !assignedIds.has(t.id));

  const handleAssign = async () => {
    if (!selectedId) return;
    setActing(selectedId);
    const tpl = allTeachers.find((t) => t.id === selectedId);
    const r = await assignProfessionalToStudent(
      patientId,
      selectedId,
      tpl?.professional_type || null,
    );
    if (r.success) { toast.success("Profesional asignado"); setSelectedId(""); await refresh(); }
    else toast.error(`Error: ${r.error}`);
    setActing(null);
  };

  const handleRemove = async (professionalId: string) => {
    if (!confirm("¿Quitar este profesional del alumno?")) return;
    setActing(professionalId);
    const r = await removeProfessionalFromStudent(patientId, professionalId);
    if (r.success) { toast.success("Asignación removida"); await refresh(); }
    else toast.error(`Error: ${r.error}`);
    setActing(null);
  };

  const TYPE_LABEL: Record<string, string> = {
    kinesiologist: "Kinesiología",
    nutritionist: "Nutrición",
    therapist: "Terapia",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-white font-semibold font-lexend text-sm mb-1">
          Profesionales asignados
        </h3>
        <p className="text-xs text-gray-500">
          Determina qué profesionales pueden ver y administrar a este alumno.
        </p>
      </div>

      {assigned.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center bg-white/[0.02] rounded-lg border border-white/[0.04]">
          Sin profesionales asignados. El alumno no aparecerá en la lista de ningún profesional hasta que se le asigne uno.
        </p>
      ) : (
        <ul className="space-y-2">
          {assigned.map((a) => (
            <li
              key={a.professional_id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0f131a] border border-white/[0.06]"
            >
              <Briefcase className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{a.full_name || "Profesional"}</p>
                {a.professional_type && (
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-0.5">
                    {TYPE_LABEL[a.professional_type] || a.professional_type}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRemove(a.professional_id)}
                disabled={acting === a.professional_id}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-40"
                title="Quitar asignación"
              >
                {acting === a.professional_id
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <X className="w-4 h-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2 border-t border-white/[0.04]">
        <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
          Agregar profesional
        </label>
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={available.length === 0}
            className="flex-1 bg-[#05050A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-h-[40px]"
          >
            <option value="">
              {available.length === 0
                ? "Todos los profesionales ya están asignados"
                : "— Selecciona un profesional —"}
            </option>
            {available.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
                {t.professional_type ? ` · ${TYPE_LABEL[t.professional_type] || t.professional_type}` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!selectedId || !!acting}
            className="px-4 rounded-lg bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] font-bold text-sm disabled:opacity-40 transition flex items-center gap-1.5 min-h-[40px]"
          >
            {acting === selectedId
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Plus className="w-4 h-4" />}
            Asignar
          </button>
        </div>
        {available.length === 0 && allTeachers.length === 0 && (
          <p className="text-[11px] text-gray-500 mt-2">
            Aún no hay profesionales en el sistema. Créalos desde Administración → Profesionales.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar que el proyecto compila**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run typecheck`
Expected: sin errores nuevos relacionados a este archivo (todavía no lo importa nadie, así
que solo valida que el archivo en sí es válido).

- [ ] **Step 3: Commit**

```bash
git add client/components/dashboard/patient-detail/panels.tsx
git commit -m "refactor(patient-detail): extract Notes/Attendance/Pause/Professionals panels to shared module"
```

---

### Task 5: Crear `PatientDetailPage.tsx` y eliminar `PatientDetailModal.tsx`

**Files:**
- Create: `client/pages/PatientDetailPage.tsx`
- Delete: `client/components/dashboard/PatientDetailModal.tsx`

- [ ] **Step 1: Crear la página nueva**

```tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, StickyNote, Pause, ClipboardList, AlertTriangle, LineChart, Briefcase,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getPatient, type PatientProfile } from "@/services/supabase";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";
import BottomNav from "@/components/dashboard/BottomNav";
import PatientForm from "@/components/dashboard/PatientForm";
import EvaluationsPanel from "@/components/dashboard/EvaluationsPanel";
import {
  NotesPanel, AttendancePanel, PausePanel, ProfessionalsPanel,
  CRITICAL_KEYS, CRITICAL_LABELS,
} from "@/components/dashboard/patient-detail/panels";

type Tab = "form" | "notes" | "attendance" | "evaluations" | "professionals" | "pause";
const VALID_TABS: Tab[] = ["form", "notes", "attendance", "evaluations", "professionals", "pause"];

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAdmin } = useAuth();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [formDirty, setFormDirty] = useState(false);

  const tabParam = searchParams.get("tab");
  const tab: Tab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "form";

  const refresh = async () => {
    if (!id) return;
    const r = await getPatient(id);
    if (r.success) setPatient(r.data || null);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  if (!id) return null;

  const confirmLeaveIfDirty = () =>
    !formDirty || confirm("Tienes cambios sin guardar. ¿Deseas salir de todas maneras?");

  const handleBack = () => {
    if (!confirmLeaveIfDirty()) return;
    navigate(-1);
  };

  const handleTabClick = (next: Tab) => {
    if (tab === "form" && next !== "form" && !confirmLeaveIfDirty()) return;
    setSearchParams(next === "form" ? {} : { tab: next });
  };

  const criticalConditions = (patient?.diseases || []).filter((d) => CRITICAL_KEYS.has(d));
  const parqNotCleared = patient?.parq_cleared === false;
  const hasAllergies = !!patient?.allergies?.trim();

  return (
    <div className="flex h-screen bg-[#05050A] text-white overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="teacher"
        activeTab="patients"
        onTabChange={(t) => navigate(`/dashboard/teacher?tab=${t}`)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-0">
        <DashboardTopBar
          onMenuToggle={() => setSidebarOpen(true)}
          activeTab="patients"
          onTabChange={(t) => navigate(`/dashboard/teacher?tab=${t}`)}
        />

        <main className="flex-1 overflow-y-auto bg-[#0a0e1a] px-5 pt-5 lg:px-6 lg:pt-6 pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-white font-montserrat">
                  {patient?.full_name || "Paciente"}
                </h1>
                {patient?.is_paused && (
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Pause className="w-3 h-3" /> Pausado{patient?.pause_reason ? `: ${patient.pause_reason}` : ""}
                  </div>
                )}
              </div>
            </div>

            {(criticalConditions.length > 0 || parqNotCleared || hasAllergies) && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-200 space-y-0.5 min-w-0 flex-1">
                  <p className="font-semibold">⚠ Alertas críticas a considerar</p>
                  {parqNotCleared && <p>• PAR-Q indica no apto sin autorización médica</p>}
                  {criticalConditions.length > 0 && (
                    <p>
                      • Condiciones:{" "}
                      {criticalConditions.map((d) => CRITICAL_LABELS[d] || d).join(", ")}
                    </p>
                  )}
                  {hasAllergies && <p>• Alergias: {patient?.allergies}</p>}
                </div>
              </div>
            )}

            <div className="flex gap-1 border-b border-white/10 overflow-x-auto">
              <TabBtn active={tab === "form"} onClick={() => handleTabClick("form")}>Datos</TabBtn>
              <TabBtn active={tab === "notes"} onClick={() => handleTabClick("notes")}>
                <StickyNote className="w-3.5 h-3.5" /> Notas
              </TabBtn>
              <TabBtn active={tab === "attendance"} onClick={() => handleTabClick("attendance")}>
                <ClipboardList className="w-3.5 h-3.5" /> Asistencia
              </TabBtn>
              <TabBtn active={tab === "evaluations"} onClick={() => handleTabClick("evaluations")}>
                <LineChart className="w-3.5 h-3.5" /> Evaluaciones
              </TabBtn>
              {isAdmin && (
                <TabBtn active={tab === "professionals"} onClick={() => handleTabClick("professionals")}>
                  <Briefcase className="w-3.5 h-3.5" /> Profesionales
                </TabBtn>
              )}
              {isAdmin && (
                <TabBtn active={tab === "pause"} onClick={() => handleTabClick("pause")}>
                  <Pause className="w-3.5 h-3.5" /> {patient?.is_paused ? "Reanudar" : "Pausar"}
                </TabBtn>
              )}
            </div>

            <div>
              {tab === "form" && (
                <PatientForm
                  patientId={id}
                  onSaved={refresh}
                  onCancel={() => navigate(-1)}
                  onDirtyChange={setFormDirty}
                />
              )}
              {tab === "notes" && <NotesPanel patientId={id} />}
              {tab === "attendance" && <AttendancePanel patientId={id} />}
              {tab === "evaluations" && <EvaluationsPanel patientId={id} />}
              {tab === "professionals" && isAdmin && <ProfessionalsPanel patientId={id} />}
              {tab === "pause" && isAdmin && (
                <PausePanel
                  patientId={id}
                  isPaused={!!patient?.is_paused}
                  onChanged={() => { refresh(); navigate(-1); }}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <BottomNav userRole="teacher" activeTab="patients" onTabChange={(t) => navigate(`/dashboard/teacher?tab=${t}`)} />
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold whitespace-nowrap transition ${
        active ? "text-[#00d4ff] border-b-2 border-[#00d4ff]" : "text-gray-400 hover:text-white"
      }`}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Eliminar el modal viejo**

```bash
rm client/components/dashboard/PatientDetailModal.tsx
```

- [ ] **Step 3: Verificar que el proyecto compila**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run typecheck`

Esto **fallará** en este punto porque `PatientsList.tsx` todavía importa
`PatientDetailModal` (se corrige en el Task 7) — confirma que el único error nuevo es
exactamente ese (`Cannot find module './PatientDetailModal'` o equivalente) y ningún otro.

- [ ] **Step 4: Commit**

```bash
git add client/pages/PatientDetailPage.tsx
git rm client/components/dashboard/PatientDetailModal.tsx
git commit -m "feat(patient-detail): replace PatientDetailModal with full-page /dashboard/patients/:id"
```

---

### Task 6: Crear `TeacherDetailPage.tsx` y eliminar `TeacherDetailModal.tsx`

**Files:**
- Create: `client/pages/TeacherDetailPage.tsx`
- Delete: `client/components/dashboard/TeacherDetailModal.tsx`

- [ ] **Step 1: Crear la página nueva**

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";
import DashboardTopBar from "@/components/dashboard/DashboardTopBar";
import BottomNav from "@/components/dashboard/BottomNav";
import TeacherProfileForm from "@/components/dashboard/TeacherProfileForm";

export default function TeacherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formDirty, setFormDirty] = useState(false);

  if (!id) return null;

  const handleBack = () => {
    if (formDirty && !confirm("Tienes cambios sin guardar. ¿Deseas salir de todas maneras?")) return;
    navigate(-1);
  };

  return (
    <div className="flex h-screen bg-[#05050A] text-white overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="teacher"
        activeTab="patients"
        onTabChange={(t) => navigate(`/dashboard/teacher?tab=${t}`)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-0">
        <DashboardTopBar
          onMenuToggle={() => setSidebarOpen(true)}
          activeTab="patients"
          onTabChange={(t) => navigate(`/dashboard/teacher?tab=${t}`)}
        />

        <main className="flex-1 overflow-y-auto bg-[#0a0e1a] px-5 pt-5 lg:px-6 lg:pt-6 pb-[calc(80px+env(safe-area-inset-bottom))] lg:pb-6">
          <div className="max-w-4xl mx-auto space-y-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>

            <h1 className="text-lg font-bold text-white font-montserrat">Profesional</h1>

            <TeacherProfileForm teacherId={id} onDirtyChange={setFormDirty} />
          </div>
        </main>
      </div>

      <BottomNav userRole="teacher" activeTab="patients" onTabChange={(t) => navigate(`/dashboard/teacher?tab=${t}`)} />
    </div>
  );
}
```

- [ ] **Step 2: Eliminar el modal viejo**

```bash
rm client/components/dashboard/TeacherDetailModal.tsx
```

- [ ] **Step 3: Verificar que el proyecto compila**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run typecheck`

Igual que en el Task 5, fallará por la importación pendiente en `PatientsList.tsx` — confirma
que es el único error nuevo.

- [ ] **Step 4: Commit**

```bash
git add client/pages/TeacherDetailPage.tsx
git rm client/components/dashboard/TeacherDetailModal.tsx
git commit -m "feat(teacher-detail): replace TeacherDetailModal with full-page /dashboard/teachers/:id"
```

---

### Task 7: Rutas en `App.tsx` y navegación en `PatientsList.tsx`

**Files:**
- Modify: `client/App.tsx`
- Modify: `client/components/dashboard/PatientsList.tsx`

- [ ] **Step 1: Agregar los imports lazy y las rutas en `App.tsx`**

Agregar a los lazy imports existentes (junto a `StudentCalendar`, etc.):

```tsx
const PatientDetailPage = lazy(() => import("./pages/PatientDetailPage"));
const TeacherDetailPage = lazy(() => import("./pages/TeacherDetailPage"));
```

Agregar las rutas (junto a las demás rutas `/dashboard/*`, con `requiredRole="teacher"`
igual que `/dashboard/teacher`):

```tsx
            <Route
              path="/dashboard/patients/:id"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <Suspense fallback={<LoadingFallback />}>
                    <PatientDetailPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/teachers/:id"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <Suspense fallback={<LoadingFallback />}>
                    <TeacherDetailPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
```

- [ ] **Step 2: Actualizar `PatientsList.tsx` para navegar en vez de abrir modales**

Cambiar la línea 1 (agregar `useNavigate`):

```tsx
import { useEffect, useState, useMemo } from "react";
```

por:

```tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
```

Eliminar las líneas 15-16 (imports de los modales):

```tsx
import PatientDetailModal from "./PatientDetailModal";
import TeacherDetailModal from "./TeacherDetailModal";
```

Dentro de `export default function PatientsList(...)`, eliminar el estado `selected`
(línea `const [selected, setSelected] = useState<PatientProfile | null>(null);`) y agregar
`const navigate = useNavigate();` justo antes.

Cambiar el botón "Ver / Editar" (líneas 298-301):

```tsx
                  <button onClick={() => setSelected(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg text-xs font-semibold hover:bg-[#00d4ff]/20 transition">
                    <Eye className="w-3.5 h-3.5" /> Ver / Editar
                  </button>
```

por:

```tsx
                  <button onClick={() => navigate(isTeacherView ? `/dashboard/teachers/${p.id}` : `/dashboard/patients/${p.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg text-xs font-semibold hover:bg-[#00d4ff]/20 transition">
                    <Eye className="w-3.5 h-3.5" /> Ver / Editar
                  </button>
```

Eliminar el bloque de render condicional de los modales (líneas 315-331):

```tsx
      {selected && isTeacherView && (
        <TeacherDetailModal
          teacherId={selected.id}
          teacherName={selected.full_name || "Profesional"}
          onClose={() => { setSelected(null); fetchAll(); }}
        />
      )}
      {selected && !isTeacherView && (
        <PatientDetailModal
          patientId={selected.id}
          patientName={selected.full_name || "Paciente"}
          isPaused={!!selected.is_paused}
          pauseReason={selected.pause_reason}
          onClose={() => setSelected(null)}
          onChanged={fetchAll}
        />
      )}
```

(Se elimina por completo, sin reemplazo — la navegación ahora ocurre en el botón.)

- [ ] **Step 3: Verificar que el proyecto compila**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run typecheck`
Expected: sin errores (los de los Tasks 5/6 quedan resueltos).

- [ ] **Step 4: Commit**

```bash
git add client/App.tsx client/components/dashboard/PatientsList.tsx
git commit -m "feat(routing): wire /dashboard/patients/:id and /dashboard/teachers/:id, navigate from PatientsList instead of opening modals"
```

---

### Task 8: Regresión completa

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Typecheck y tests**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run typecheck && npm run test`
Expected: typecheck sin errores nuevos; tests en el mismo baseline conocido (36/37, falla
preexistente y no relacionada de `phase-5-features.spec.ts`).

- [ ] **Step 2: Levantar el dev server y probar en navegador**

Run: `export PATH="/Users/jonachoGonz/.nvm/versions/node/v22.16.0/bin:$PATH" && npm run dev`

Probar manualmente como admin/profesor logueado:
1. Ir a la lista de Alumnos, click "Ver / Editar" en un alumno → confirma que navega a
   `/dashboard/patients/:id` (no abre modal), se ven los 6 tabs superiores, y el tab
   "Datos" muestra las 4 sub-tabs (Perfil/Salud/Evaluación inicial/Administrativo).
2. Cambiar a tab "Notas" → confirma que la URL refleja `?tab=notes` y que recargar la
   página en ese estado (F5) mantiene el tab activo.
3. Click "← Volver" sin haber tocado nada → confirma que vuelve a la lista sin preguntar
   nada.
4. Volver a entrar, modificar un campo en "Datos" (sin guardar), click "← Volver" →
   confirma que aparece el `confirm()` de cambios sin guardar; cancelarlo y confirmar que
   sigue en la página; volver a intentar y aceptar → confirma que navega.
5. Modificar un campo en "Datos" sin guardar y cambiar al tab "Asistencia" → confirma el
   mismo aviso.
6. Modificar y Guardar → confirma que después de guardar, "← Volver" ya NO pregunta nada.
7. Ir a la lista de Profesionales (tab Profesionales/Admin), click "Ver / Editar" en uno →
   confirma que navega a `/dashboard/teachers/:id`, sin tabs superiores, formulario
   completo visible sin scroll infinito grave (7 secciones cortas). Repetir el mismo
   chequeo de aviso de cambios sin guardar en "← Volver".
8. Desde `OnboardingWizard` (alta de alumno nuevo) y desde la sección de configuración del
   propio alumno (`StudentSettingsSection`), confirmar que ambos también muestran las 4
   sub-tabs de `PatientForm` y siguen funcionando para guardar.

- [ ] **Step 3: Commit final si hubo ajustes**

Si el paso 2 encontró algo que ajustar, commitearlo con un mensaje descriptivo. Si no hubo
cambios, no se necesita commit en este task.

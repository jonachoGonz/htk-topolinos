# Patient Management — Future Improvements Roadmap

**Status:** Bloque verde (1-5) ✅ IMPLEMENTED. Bloques 6-15 pending.
**Last updated:** 2026-05-30

---

## ✅ Bloque Verde — IMPLEMENTED (PR #14 + this PR)

| # | Improvement | Status |
|---|------------|--------|
| 1 | Photo upload from camera/gallery (Supabase Storage) | ✅ `PhotoUploader.tsx` |
| 2 | Chilean RUT validation + auto-formatting | ✅ `client/lib/rut.ts` |
| 3 | WhatsApp quick-contact button | ✅ in `PatientsList.tsx` |
| 4 | Body measurements (cintura, cadera, pecho, brazo, muslo, pantorrilla) | ✅ Migration 008 + form section |
| 5 | PAR-Q (7-question physical readiness questionnaire) | ✅ Migration 008 + form section |

### Bonus included with bloque verde
- **Critical alerts banner** in `PatientDetailModal` — surfaces allergies, critical diseases, and PAR-Q "not cleared" status at the top of the modal
- **Critical badges** on the `PatientsList` cards (diabetes T1, epilepsia, cardio, marcapasos, embarazo, cáncer, PAR-Q not apto)
- **Cintura/cadera ratio** auto-calculated when both fields are filled

---

## 🟡 Bloque Amarillo — TO DO (medium impact, medium effort)

### 6. Historial de composición corporal (mini chart)
**Effort:** 4 hours
**Why:** Show patient progress over time (weight, BMI, body_fat) so professionals can demonstrate results.

**Implementation outline:**
- New table `patient_metrics_history (id, patient_id, recorded_at, weight_kg, height_cm, body_fat_pct, muscle_mass_pct, bone_mass_pct, waist_cm, hip_cm, ...)`
- On `PatientForm` save, if any body metric changed, snapshot a row
- Mini `recharts` line chart in `PatientDetailModal` under a new "Progreso" tab
- Show 3-month / 6-month / 1-year toggles

### 7. Document attachments (PDFs)
**Effort:** 3 hours
**Why:** Upload medical reports, prescriptions, exam results.

**Implementation outline:**
- New Supabase Storage bucket `patient-documents` (private, RLS: teachers/admin read all, patient reads own)
- New table `patient_documents (id, patient_id, name, description, file_url, uploaded_by, uploaded_at)`
- New section in `PatientDetailModal` for list/upload/delete
- Support PDF, JPG, PNG

### 8. Multiple emergency contacts
**Effort:** 2 hours
**Why:** Primary + secondary contact (parent + spouse, etc).

**Implementation outline:**
- New table `patient_emergency_contacts (id, patient_id, name, phone, relation, priority, created_at)`
- Replace single-contact UI with repeatable rows in PatientForm
- Migrate existing single contact to row with priority=1

### 9. Critical condition reminders / alerts
**Status:** ✅ PARTIAL — already added banner in `PatientDetailModal` and badges on list cards.
**Pending:** Toast/notification when teacher first opens a patient with critical condition this session (1 per session, dismissable).

### 10. PDF export of patient profile
**Effort:** 4 hours
**Why:** Print or share with other professionals; legal archive.

**Implementation outline:**
- Add `jspdf` + `jspdf-autotable` dependencies
- "Exportar PDF" button in `PatientDetailModal` header
- Generate sectioned PDF: foto, datos, médicos, mediciones, PAR-Q result
- Hide private notes from export (unless admin chooses to include)

---

## 🔵 Bloque Azul — LONG TERM (when business scales)

### 11. Audit log
**Effort:** 4-6 hours
**Why:** Compliance with Chilean Ley 19.628 (datos personales) and GDPR if expanding internationally. Critical for sensitive medical data.

**Implementation outline:**
- New table `profile_audit_log (id, profile_id, actor_id, action, field, old_value, new_value, ip, user_agent, created_at)`
- DB triggers on `profiles UPDATE` and `patient_notes INSERT/UPDATE/DELETE`
- Admin-only viewer screen with filters (by patient, by actor, date range)

### 12. Birthday notifications & customer success
**Effort:** 6 hours
**Why:** Reduce churn; build relationship.

**Implementation outline:**
- "Cumpleañeros del mes" dashboard widget for admin
- Optional automated email/WhatsApp via Supabase Edge Function + Resend/Twilio
- Track `last_birthday_greeting_at` to avoid duplicates

### 13. Bulk CSV import
**Effort:** 4 hours
**Why:** Onboarding migration from existing system / spreadsheets with 100+ patients.

**Implementation outline:**
- Admin-only screen with drag-drop CSV
- Parse with `papaparse`
- Validate each row (required fields, RUT format)
- Show preview + errors
- On confirm, batch upsert via RPC `admin_upsert_patient`

### 14. Timeline / clinical history view
**Effort:** 5 hours
**Why:** See patient story in chronological order (signup, plan changes, pauses, attendance, notes).

**Implementation outline:**
- Union query across `profiles` (signup), `plans` (assignments), `patient_notes`, `bookings` (attendance), `profile_audit_log` (pause)
- Single timeline component sorted DESC
- Filter by event type

### 15. Structured goals tracking
**Effort:** 6 hours
**Why:** Quantitative goal tracking (e.g., "lose 10kg by Aug 2026") vs free-text "perder peso".

**Implementation outline:**
- New table `patient_goals (id, patient_id, type, metric, target_value, current_value, deadline, status, created_at)`
- Types: weight, body_fat_pct, performance, recovery, custom
- Auto-update `current_value` when relevant body metric is updated
- Progress bar UI; celebration animation when achieved

---

## 🚀 Suggested Sprint Sequence

When ready to continue this roadmap:

**Sprint 1 (1 day):** #6 (progress chart) + #9 (toast on open)
**Sprint 2 (1 day):** #7 (documents) + #8 (multi emergency)
**Sprint 3 (1 day):** #10 (PDF export) + #14 (timeline)
**Sprint 4 (1-2 days):** #11 (audit log) — compliance
**Sprint 5 (1 day):** #15 (structured goals) — premium feature
**Sprint 6 (1 day):** #12 (birthdays) + #13 (bulk import) — operations

---

## How to resume

1. Pick a sprint above
2. Create branch `feature/patients-<sprint-name>`
3. The bloque-verde infra (PhotoUploader, RUT helpers, etc.) can be reused
4. Reference this file and PR #14/#15 for context

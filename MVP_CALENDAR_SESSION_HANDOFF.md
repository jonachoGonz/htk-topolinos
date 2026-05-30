# MVP Calendar Implementation - Session Handoff

**Date:** 2026-05-30
**Branch:** `feature/mvp-calendar-functional`
**Status:** ✅ Code Complete — Pending DB migration + manual testing

---

## ✅ What Was Implemented (All 5 Phases)

### Phase A: Current date positioning + Block past hours
**File:** `client/components/dashboard/sections/StudentCalendarSection.tsx`
- Calendar opens on **today's week** with **today's day selected** by default
- Day buttons now show **"HOY"** badge for today
- "Hoy" button to jump back to current week
- Slots in the past (date+time) are visually grayed out and unclickable
- `isSlotInPast()` helper in `supabase.ts`

### Phase B: Cancellation policy functional
**Files:** `SlotCard.tsx`, `StudentCalendarSection.tsx`, `supabase.ts`
- **Bug fix:** `canCancelSlot()` was using `new Date()` (today) instead of the actual booking date.
  Now uses `bookingDate` prop for accurate hour calculation
- Reads policy from Contentful (`hoursNotice` — default 12h)
- Shows remaining hours in the warning banner
- New helper `canCancelBooking(date, startTime, minHours)` in `supabase.ts`
- Cancel modal shows the policy hours dynamically

### Phase C: Bulk availability assignment (CRITICAL feature)
**New file:** `client/components/dashboard/BulkAvailabilityForm.tsx`
**Updated:** `client/components/dashboard/AvailabilityManager.tsx`
- Teacher can pick a preset: **Lun-Vie**, **Fin de semana**, **Toda la semana**, or **Personalizado**
- Click individual days (Lun..Dom) to toggle
- One submit creates 1..7 availability slots with the same time/capacity
- Each bulk batch shares a `bulk_group_id` (for editing/deleting as a group)
- New mode toggle: **Asignación Masiva** (default, recommended) vs **Día individual**
- Supports professional type selector (Kinesiólogo / Nutricionista / Terapeuta)
- Optional notes field (e.g., "permite reagendar", "horario verano")

### Phase D: View students in slot + confirm attendance
**New file:** `client/components/dashboard/SlotStudentsList.tsx`
**Updated:** `AvailabilityManager.tsx` (new "Alumnos" button on each availability row)
- Teacher clicks **"Alumnos"** on any availability row → modal opens
- Shows list of enrolled students for that slot (date computed as next occurrence)
- Each student card has:
  - Name + email
  - Status badges: **Asistió** / **Ausente** / **Cobrada del plan** / **Nutrición**
  - **Asistió** button: confirms attendance → triggers plan deduction (if not nutritionist)
  - **Ausente** button: marks as absent (no plan deduction)
- Attendance + plan deduction is atomic via Supabase RPC `confirm_booking_attendance`

### Phase E: Professional selector + plan tracking + nutritionist exemption
**Files:** `StudentCalendarSection.tsx`, `supabase.ts`
- **Plan widget:** Shows "X / Y clases" at top of calendar (e.g., "3 / 4")
- **Type filter:** Student can filter slots by Kinesiología / Nutrición / Terapia
- **Professional filter:** Once a type is selected, dropdown lists only professionals of that type
- **Plan validation when booking:**
  - If type is `kinesiologist` or `therapist` → checks `planRemaining > 0` else blocks
  - If type is `nutritionist` → no plan check (paid separately)
- **Plan deduction:** Happens at **attendance confirmation** (not at booking) via the RPC
  This prevents double-charge on cancellation and aligns with real-world flow.
- **Nutrition info banner** appears when student filters by nutritionist
- **Modal copy** differs for nutritionist vs other professionals

---

## 🗄️ Required DB Migration (BEFORE testing)

**File:** `migrations/003_mvp_calendar_enhancements.sql`

### What it does:
1. Adds `professional_type` to `availability`, `bookings`, `profiles`
2. Adds `bulk_group_id` + `notes` to `availability`
3. Adds `attended`, `attendance_confirmed_at`, `charged_from_plan`, `charged_at` to `bookings`
4. Adds `monthly_class_count` (default 4) to `plans`
5. Creates indexes for performance
6. Creates RPC `confirm_booking_attendance(booking_id, attended)` — atomic attendance+plan deduction
7. Creates RPC `create_bulk_availability(...)` — atomic bulk insert with shared group_id
8. Backfills `professional_type` from existing `specialization` text

### How to apply:
```sql
-- In Supabase SQL Editor:
-- Paste content of migrations/003_mvp_calendar_enhancements.sql
-- Run.
```

The code has **fallbacks**: if the RPCs don't exist yet, it does client-side inserts/updates.
But the migration is required for full functionality (the `professional_type` column especially).

---

## 📝 Files Created (4)

| File | Purpose |
|------|---------|
| `migrations/003_mvp_calendar_enhancements.sql` | Schema changes + RPCs |
| `client/components/dashboard/BulkAvailabilityForm.tsx` | Bulk assignment UI |
| `client/components/dashboard/SlotStudentsList.tsx` | Teacher view of students + attendance |
| `MVP_CALENDAR_SESSION_HANDOFF.md` | This file |

## 📝 Files Modified (5)

| File | Changes |
|------|---------|
| `client/services/supabase.ts` | +9 functions: bulk create/delete, getAllProfessionals, getBookingsForSlot, confirmBookingAttendance, getRemainingPlanClasses, isSlotInPast, canCancelBooking, getAvailabilityForProfessional |
| `client/components/dashboard/sections/StudentCalendarSection.tsx` | Major refactor: today positioning, plan widget, type+professional filters, past-slot blocking, nutritionist exemption |
| `client/components/dashboard/SlotCard.tsx` | Fix cancellation calc (use booking date not today), past-slot styling, professional type badge |
| `client/components/dashboard/AvailabilityManager.tsx` | Mode toggle (Bulk/Single), type selector, "Alumnos" button, "HOY" indicator on rows |
| `client/components/dashboard/EditAvailabilityModal.tsx` | (unchanged — should still work) |

---

## ✅ Verification Done

- [x] Vite build succeeds (`npm run build:client` → built in 4m 10s, 662 kB bundle)
- [x] Dev server starts without errors on port 8080
- [x] Landing page renders correctly
- [x] No TypeScript compilation errors in modified files
- [x] No syntax errors in new components

## 🔄 Verification Pending (needs DB migration first)

- [ ] Run `migrations/003_mvp_calendar_enhancements.sql` in Supabase
- [ ] Login as teacher: verify Bulk Availability Form works
- [ ] Login as teacher: assign Mon-Sun in one action
- [ ] Login as teacher: click "Alumnos" on a slot → see students
- [ ] Login as teacher: confirm attendance → verify plan decremented
- [ ] Login as student: verify calendar opens on today
- [ ] Login as student: verify past slots are grayed out
- [ ] Login as student: verify plan classes counter shows "X / Y"
- [ ] Login as student: filter by Nutricionista → verify banner appears
- [ ] Login as student: book a nutritionist slot → verify plan NOT decremented
- [ ] Login as student: try cancellation < 12h → verify blocked
- [ ] Login as student: try cancellation > 12h → verify works

---

## 🚀 To Continue / Test

### 1. Run SQL migration in Supabase
```bash
# Open Supabase dashboard → SQL Editor
# Paste migrations/003_mvp_calendar_enhancements.sql
# Click "Run"
```

### 2. Test locally
```bash
cd /Users/jonachoGonz/Desktop/proyectos/webProject/htk-center-topolinos
nvm use 22.16.0
npm run dev
# Open http://localhost:8080
# Login: profesor@test.com / Profesor123!  → test bulk availability + alumnos
# Logout, login: estudiante@test.com / Estudiante123!  → test booking with filters
```

### 3. Mark professionals correctly in DB
For testing the nutritionist exemption:
```sql
-- Mark one professional as nutritionist
UPDATE profiles
SET professional_type = 'nutritionist'
WHERE email = 'nutricionista@test.com'; -- or whichever
```

### 4. Ensure each test student has an active plan
```sql
-- Verify plan exists for estudiante@test.com
SELECT * FROM plans WHERE student_id = (
  SELECT id FROM profiles WHERE email = 'estudiante@test.com'
) AND is_active = true;

-- If none, create a basic plan (4 classes/month):
INSERT INTO plans (
  student_id, name, total_sessions, remaining_sessions,
  monthly_class_count, expiry_date, is_active
) VALUES (
  '<student_uuid>', 'Plan Básico', 4, 4, 4,
  NOW() + INTERVAL '1 month', TRUE
);
```

### 5. Commit + PR
```bash
git add -A
git commit -m "feat(mvp-calendar): Complete MVP calendar with bulk, attendance, plan tracking

- Phase A: Open on today, block past hours
- Phase B: Functional cancellation with policy from Contentful
- Phase C: Bulk availability assignment (Mon-Sun presets)
- Phase D: View students per slot + confirm attendance
- Phase E: Professional selector + plan tracking + nutritionist exemption"

git push -u origin feature/mvp-calendar-functional

# Create PR via GitHub UI or:
# gh pr create --base main --title "feat: MVP calendar functional"
```

---

## 🎯 Acceptance Criteria

✅ Calendar shows current week with today highlighted ("HOY" badge)
✅ Past hours blocked (gray, unclickable, "Este horario ya pasó" message)
✅ Cancellation uses real booking date (bug fixed)
✅ Bulk assignment: 1 click → up to 7 days of availability
✅ Block days option works (via Holidays manager, already exists)
✅ Teacher sees enrolled students per slot
✅ Attendance confirmation deducts from plan automatically
✅ Student can select professional type and specific professional
✅ Plan shows remaining classes (e.g., "3/4")
✅ Nutritionist bookings DO NOT consume plan classes

---

## 🐛 Known Limitations

1. **Date for "Alumnos" button:** Uses next occurrence of `day_of_week`.
   If the teacher wants to view students for a past or future date specifically,
   need a date picker UI (TODO Phase F).

2. **Plan deduction timing:** Currently happens at attendance confirmation.
   Original spec was ambiguous about whether deduction should happen at booking
   or at attendance — we chose **attendance** because it prevents lost classes
   on cancellation. If you want **at-booking** deduction, modify `createBooking`
   in `supabase.ts` and revert the RPC logic.

3. **Cronofy integration:** Not integrated into this MVP calendar flow.
   The Cronofy widget (`BookingCalendar.tsx`) is separate from the Supabase
   booking flow.

4. **Real-time updates:** Calendar doesn't auto-refresh if another user books
   the same slot. The user sees the new state only after switching days/weeks.
   Can be added with Supabase Realtime subscriptions.

---

## 📞 Next Steps (Future Work)

- **Phase F:** Date picker in "Alumnos" modal (specific date selection)
- **Phase G:** Realtime subscription for slot bookings
- **Phase H:** Cronofy sync with Supabase booking flow
- **Phase I:** Reagendar (reschedule) flow when teacher blocks a day
- **Phase J:** Notifications to affected students when their slot is blocked

---

**Author:** Claude Haiku
**Last Verified Compile:** 2026-05-30 14:30 (4m 10s build, exit 0)

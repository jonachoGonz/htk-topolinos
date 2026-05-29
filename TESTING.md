# Phase 1 - Testing Guide

## ✅ Pre-Testing Checklist

- [ ] SQL schema executed in Supabase (all tables created)
- [ ] RLS policies enabled in Supabase
- [ ] Local project built: `pnpm run build`
- [ ] Server running: `pnpm run dev` (should start on http://localhost:5173)

---

## 🚀 Testing Endpoints

Start the dev server with: `pnpm run dev`

### Test 1: Health Check
```bash
curl http://localhost:5173/api/ping
# Expected: {"message":"ping"}
```

### Test 2: Get Availability (Empty)
```bash
curl http://localhost:5173/api/availability/prof-123
# Expected: {"success":true,"data":[]}
```

### Test 3: Create Availability
```bash
curl -X POST http://localhost:5173/api/availability \
  -H "Content-Type: application/json" \
  -d '{
    "professionalId": "prof-123",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "10:30",
    "maxCapacity": 5
  }'
# Expected: {"success":true}
```

### Test 4: Get Bookings (Empty)
```bash
curl "http://localhost:5173/api/bookings?type=student&userId=student-456"
# Expected: {"success":true,"data":[]}
```

### Test 5: Create Booking
```bash
curl -X POST http://localhost:5173/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-456",
    "professionalId": "prof-123",
    "bookingDate": "2026-05-30",
    "startTime": "09:00",
    "endTime": "10:30",
    "notes": "First session"
  }'
# Expected: {"success":true,"data":{...}}
```

### Test 6: Get Plans (Empty)
```bash
curl http://localhost:5173/api/plans/student-456
# Expected: {"success":true} (no data = no active plan)
```

### Test 7: Create Plan
```bash
curl -X POST http://localhost:5173/api/plans \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student-456",
    "name": "Plan Básico Mensual",
    "totalSessions": 8,
    "expiryDate": "2026-06-28"
  }'
# Expected: {"success":true,"data":{...}}
```

---

## 🔍 Verify in Supabase

Go to https://app.supabase.com and check:

1. **availability** table
   - Should have records after Test 3
   - Columns: id, professional_id, day_of_week, start_time, end_time, max_capacity, created_at

2. **bookings** table
   - Should have records after Test 5
   - Columns: id, student_id, professional_id, booking_date, start_time, end_time, status, created_at

3. **plans** table
   - Should have records after Test 7
   - Columns: id, student_id, name, total_sessions, remaining_sessions, expiry_date, is_active, created_at

4. **RLS Policies** → Authentication → Policies
   - availability: 2 policies (profs_manage_availability, students_read_availability)
   - bookings: 2 policies (students_own_bookings, profs_see_their_bookings)
   - plans: 1 policy (students_own_plans)
   - progress_records: 2 policies (patient_sees_own, prof_manages_own)

---

## ❌ Troubleshooting

### Error: "professionalId is required"
- Check that you're sending the correct parameter in the request

### Error: "relation \"availability\" does not exist"
- SQL schema wasn't executed. Go back to Supabase SQL Editor and run the migration

### Error: CORS error
- CORS is enabled in Express. If still failing, check that the server is running on correct port

### Error: 500 Internal Server Error
- Check terminal logs where you ran `pnpm run dev`
- Likely issue: Supabase credentials (.env variables)

---

## ✨ Success Criteria

Phase 1 is complete when:
- [ ] All 7 curl tests pass with expected responses
- [ ] Supabase shows created records in each table
- [ ] RLS policies are visible in Supabase Dashboard
- [ ] No errors in browser console or terminal

---

## 📝 Notes

- UUIDs in examples are placeholders. Use real UUIDs for actual testing.
- Replace `prof-123` and `student-456` with real user IDs from your Supabase auth users
- Timestamps should be in ISO format (YYYY-MM-DD for dates, HH:MM for times)

---

**Once all tests pass, Phase 1 is ready for Phase 2 (Teacher Dashboard)!** 🚀

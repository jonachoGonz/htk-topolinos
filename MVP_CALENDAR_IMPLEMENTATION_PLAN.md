# MVP Calendar Implementation Plan

**Status:** Planning Phase  
**Priority:** CRITICAL for MVP functionality  
**Effort:** 2-3 days  

---

## Current State Analysis

### What Exists
- ✅ Basic StudentCalendarSection.tsx (week view)
- ✅ AvailabilityManager.tsx (create availability)
- ✅ EditAvailabilityModal.tsx (edit availability)
- ✅ HolidayManager.tsx (block holidays)
- ✅ SlotCard.tsx (display slots)
- ⚠️ Cancellation logic (partial - 12-hour rule)

### What's Missing
❌ Current date positioning (always shows week starting Sunday)
❌ Block past hours on current day
❌ Bulk availability assignment (7 days same time)
❌ View students in each slot
❌ Confirm student attendance
❌ Professional selector for students
❌ Plan consumption tracking
❌ Nutritionist exemption logic

---

## Requirements Breakdown

### 1. Current Date Positioning & Block Past Hours
**Component:** StudentCalendarSection.tsx  
**Changes:**
- Position calendar on current week (done - but verify)
- Show current day highlighted
- Disable booking for past hours (need time calculation)
- Show "Available", "Booked", "Past" status

**Example:**
```
TODAY (Miércoles 30 Mayo)
[07:00-08:30] PAST (grayed out)
[08:30-10:00] PAST (grayed out)
[10:00-11:30] AVAILABLE
[11:30-13:00] BOOKED
```

---

### 2. Cancel Hours with Cancellation Policy
**Component:** StudentCalendarSection.tsx / SlotCard.tsx  
**Changes:**
- Implement getCancellationPolicy from Contentful
- Show "Days to cancel: X" on booked slots
- Calculate hours remaining automatically
- Show warning if canceling within limit
- Execute cancellation with audit trail

**Rules Already Exist:**
- 12-hour cancellation window
- Reimbursement percentage
- Late cancellation penalty

---

### 3. Bulk Availability Assignment (CRITICAL)
**New Component:** BulkAvailabilityForm.tsx  
**Features:**
- Dropdown: "Apply to same time on..."
  - [ ] Just today
  - [ ] Mon-Fri (weekdays)
  - [ ] Mon-Sun (full week)
  - [ ] Specific days
- Input fields:
  - Time range (09:00-10:30)
  - Max capacity (5)
  - Professional type (Kinesiologist/Nutritionist)
- Block days/time:
  - Holiday dates
  - Personal indisponibility
  - Reagendable classes

**Database Change Needed:**
```sql
-- Add type to availability (kinesiologist/nutritionist)
ALTER TABLE availability ADD COLUMN professional_type VARCHAR(50);

-- Add bulk_group_id to group related availabilities
ALTER TABLE availability ADD COLUMN bulk_group_id UUID;

-- Add notes for reagendable info
ALTER TABLE availability ADD COLUMN notes TEXT;
```

---

### 4. View Students in Slot & Confirm Attendance
**New Component:** SlotStudentsList.tsx  
**Features:**
- Show enrolled students
- Confirm attendance checkbox
- Mark as paid/pending
- Allow reagendable notes

**Database Queries:**
- GET /api/availability/:id/students → list booked students
- POST /api/bookings/:id/attendance → mark attendance
- POST /api/bookings/:id/charged → mark charged

---

### 5. Student Selector & Plan Tracking
**Component:** StudentCalendarSection.tsx (enhance)  
**Changes:**
- Add professional selector dropdown
- Filter availability by selected professional
- Show remaining plan classes
- Validate plan-consuming vs nutrition

**Plan Object Structure:**
```typescript
interface StudentPlan {
  id: string;
  planTemplateId: string;
  remainingClasses: number; // for kinesiologist only
  expiresAt: Date;
  type: "kinesiologist" | "nutrition"; // or both
}
```

**Validation:**
- IF booking with kinesiologist AND plan.remainingClasses > 0
  → Consume 1 from plan
- IF booking with nutritionist
  → Do NOT consume from plan (separate payment)

---

## Implementation Steps

### Phase 1: Core Calendar (Day 1)
1. ✅ Fix current date positioning
2. ✅ Block past hours on current day
3. ✅ Highlight current day
4. ✅ Show plan classes remaining

### Phase 2: Cancellation (Day 1)
1. ✅ Integrate getCancellationPolicy
2. ✅ Show hours remaining before cancellation
3. ✅ Execute cancellation with toast

### Phase 3: Bulk Assignment (Day 2)
1. Create BulkAvailabilityForm.tsx
2. Add database migrations
3. Implement bulk create logic
4. Test Mon-Sun assignment

### Phase 4: Student Management (Day 2)
1. Create SlotStudentsList.tsx
2. Implement student view in modal
3. Add attendance confirmation
4. Add charging logic

### Phase 5: Professional Selector (Day 3)
1. Add professional dropdown
2. Filter by professional type
3. Handle nutritionist exemption
4. Track plan consumption

---

## Database Changes Required

```sql
-- 1. Add professional_type to availability
ALTER TABLE availability ADD COLUMN professional_type VARCHAR(50) DEFAULT 'kinesiologist';

-- 2. Add bulk_group_id
ALTER TABLE availability ADD COLUMN bulk_group_id UUID;

-- 3. Enhance bookings with attendance
ALTER TABLE bookings ADD COLUMN attended BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN charged_at TIMESTAMP;

-- 4. Add nutritionist flag to profiles
ALTER TABLE profiles ADD COLUMN is_nutritionist BOOLEAN DEFAULT FALSE;

-- 5. Create separate payment tracking for nutrition
CREATE TABLE nutrition_sessions (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES profiles(id),
  nutritionist_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMP NOT NULL,
  attended BOOLEAN DEFAULT FALSE,
  paid BOOLEAN DEFAULT FALSE,
  amount DECIMAL NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Files to Create/Modify

### Create:
- [ ] client/components/dashboard/BulkAvailabilityForm.tsx
- [ ] client/components/dashboard/ProfessionalSelector.tsx
- [ ] client/components/dashboard/SlotStudentsList.tsx
- [ ] server/routes/availability.ts (bulk endpoints)
- [ ] server/routes/attendance.ts (attendance endpoints)

### Modify:
- [ ] client/components/dashboard/sections/StudentCalendarSection.tsx
- [ ] client/components/dashboard/sections/CalendarSection.tsx
- [ ] client/components/dashboard/AvailabilityManager.tsx
- [ ] client/components/dashboard/SlotCard.tsx
- [ ] client/services/supabase.ts (add bulk functions)

---

## Success Criteria

✅ Calendar shows current week with today highlighted  
✅ Past hours blocked (gray, unclickable)  
✅ Students see plan classes remaining (e.g., "3/4 classes left")  
✅ Bulk assignment works (assign Mon-Sun in one action)  
✅ Cancellation shows hours remaining  
✅ Teachers see enrolled students in slots  
✅ Attendance confirmation works  
✅ Nutritionist bookings don't consume plan  

---

**Start Date:** 2026-05-30  
**Target Completion:** 2026-06-02  
**Priority:** 🔴 CRITICAL  

# Phase 5 - Advanced Features - Testing Guide

**Date:** 2026-05-30  
**Version:** 1.0  
**Status:** Complete Testing Manual

---

## 📋 Overview

Comprehensive manual testing guide for Phase 5 features:
- 5.1: Realtime Notifications & Messaging
- 5.2: Availability Editing
- 5.3: Holiday Management
- 5.4: Admin Analytics
- 5.5: Testing & Polish

---

## 🧪 Phase 5.1: Realtime Messaging Tests

### Test Setup
```bash
# Open two browser windows
# Window 1: Login as Teacher (prof@test.com)
# Window 2: Login as Student (student@test.com)
```

### Test Cases

#### 1.1 Send Direct Message (Student to Teacher)
**Steps:**
1. Navigate to Messaging page from student dashboard
2. Click "New Message" or find teacher in conversations list
3. Type message: "¿Cuándo es la próxima clase?"
4. Press Enter or click Send

**Expected:**
- ✅ Message appears immediately in student window
- ✅ Teacher receives realtime notification
- ✅ Toast notification appears in teacher window
- ✅ Unread badge shows "1" in teacher's conversation list
- ✅ Message timestamp shows current time

#### 1.2 Conversation History
**Steps:**
1. In Messaging page, select existing conversation
2. Scroll up to view past messages
3. Verify message order and timestamps

**Expected:**
- ✅ Messages load in chronological order (oldest first)
- ✅ Timestamps are correct
- ✅ Sender/receiver alignment is correct (blue for self, gray for other)
- ✅ At least 50 messages load

#### 1.3 Unread Count Tracking
**Steps:**
1. Teacher sends message to student
2. Student doesn't open chat yet
3. Check conversation list badge

**Expected:**
- ✅ Badge shows "1" on conversation
- ✅ Badge color is blue/prominent
- ✅ Clicking conversation marks as read
- ✅ Badge disappears after read

#### 1.4 Multiple Conversations
**Steps:**
1. Send messages in 3 different conversations
2. Go back to conversation list
3. Verify order and preview text

**Expected:**
- ✅ Most recent conversation at top
- ✅ Last message preview shows (truncated if long)
- ✅ Can switch between conversations without losing content
- ✅ Unread counts are accurate per conversation

#### 1.5 Realtime Update
**Steps:**
1. Two windows: one with conversation open, one with list
2. Window 2: Send message
3. Verify Window 1 updates without refresh

**Expected:**
- ✅ New message appears < 1 second
- ✅ Auto-scroll to latest message
- ✅ Timestamp updates
- ✅ Conversation list updates in Window 2

#### 1.6 Auto-scroll on New Message
**Steps:**
1. Open conversation with many messages
2. Scroll to middle
3. Other user sends message

**Expected:**
- ✅ Auto-scroll to bottom
- ✅ New message visible
- ✅ Previous scroll position discarded

#### 1.7 Empty Conversation State
**Steps:**
1. Select user with no prior messages
2. View chat window

**Expected:**
- ✅ Empty state message displays
- ✅ Input field is ready
- ✅ Can send first message

#### 1.8 Message Input Validation
**Steps:**
1. Try send with empty message
2. Try send with whitespace only
3. Send very long message (500+ chars)

**Expected:**
- ✅ Empty/whitespace sends disabled (button grayed)
- ✅ Long message sends successfully
- ✅ Message wraps correctly
- ✅ No character limit enforced (within reason)

---

## 🔧 Phase 5.2: Availability Editing Tests

### Test Setup
```bash
# Login as Teacher
# Navigate to Dashboard → Calendar & Availability
```

### Test Cases

#### 2.1 Edit Availability Time
**Steps:**
1. Find existing availability slot (e.g., Monday 09:00-10:30)
2. Click "Edit" button
3. Change start time to 10:00
4. Change end time to 11:00
5. Click "Guardar"

**Expected:**
- ✅ Modal opens with current values pre-filled
- ✅ Can edit all fields
- ✅ Time format validated (HH:MM)
- ✅ Success toast appears
- ✅ Table updates immediately
- ✅ Changes persist on refresh

#### 2.2 Edit Availability Capacity
**Steps:**
1. Open edit modal
2. Change capacity from 5 to 8
3. Save

**Expected:**
- ✅ Capacity field editable
- ✅ Must be >= 1
- ✅ Table shows new capacity
- ✅ Change applied to future bookings

#### 2.3 Edit Day of Week
**Steps:**
1. Edit slot from Monday to Wednesday
2. Save

**Expected:**
- ✅ Day selector works
- ✅ Can pick any day 0-6
- ✅ Display shows correct day name
- ✅ Availability moves to new day

#### 2.4 Time Validation
**Steps:**
1. Try set start time = 25:00
2. Try set start time = 10:00, end time = 09:00
3. Try format without minutes (e.g., "10")

**Expected:**
- ✅ 25:00 rejected (out of range)
- ✅ Start >= End rejected with error
- ✅ Invalid format rejected
- ✅ Error toast explains issue
- ✅ Modal stays open (no close on error)

#### 2.5 Availability Edit History
**Steps:**
1. Edit availability twice
2. Check database or admin panel for history

**Expected:**
- ✅ Each edit creates audit log entry
- ✅ Previous and new values recorded
- ✅ Timestamp recorded
- ✅ Can see change reason (if applicable)

#### 2.6 Edit with No Changes
**Steps:**
1. Open edit modal
2. Change nothing
3. Click Save

**Expected:**
- ✅ Request still sent (or skipped)
- ✅ Success message or no-op
- ✅ No error

#### 2.7 Cancel Edit
**Steps:**
1. Open edit modal
2. Make changes
3. Click "Cancelar"

**Expected:**
- ✅ Modal closes
- ✅ Changes not saved
- ✅ Table unchanged

#### 2.8 Edit While Booking Active
**Steps:**
1. Schedule booking for slot
2. Try edit that slot
3. Should allow or warn?

**Expected:**
- ✅ Edit allowed (or show warning)
- ✅ Existing bookings not canceled
- ✅ New capacity applies to future slots

---

## 🏖️ Phase 5.3: Holiday Management Tests

### Test Setup
```bash
# Login as Teacher
# Navigate to Dashboard → Calendar → Vacaciones tab
```

### Test Cases

#### 3.1 Create Single Holiday
**Steps:**
1. Click "Agregar Vacación"
2. Title: "Vacation July"
3. Start: 2026-07-01
4. End: 2026-07-31
5. is_recurring: unchecked
6. Click "Agregar Vacación"

**Expected:**
- ✅ Modal/form appears
- ✅ All fields required except notes
- ✅ Holiday added to list
- ✅ Success toast
- ✅ Form clears
- ✅ Holiday displays with date range

#### 3.2 Create Recurring Holiday
**Steps:**
1. Create holiday: "Christmas"
2. Start: 2026-12-25
3. End: 2026-12-26
4. is_recurring: checked
5. recurring_type: yearly
6. Save

**Expected:**
- ✅ Recurring type selector appears when checked
- ✅ Can select yearly or monthly
- ✅ Badge shows "Repetir anualmente"
- ✅ Persists in database

#### 3.3 Holiday with Notes
**Steps:**
1. Create holiday with notes: "Company retreat"
2. Save

**Expected:**
- ✅ Notes field optional
- ✅ Notes display below title
- ✅ Notes persist

#### 3.4 View Holiday List
**Steps:**
1. View Vacaciones tab with multiple holidays
2. Check display format

**Expected:**
- ✅ List shows all holidays
- ✅ Formatted dates (e.g., "1 de julio de 2026")
- ✅ Recurring indicator shows
- ✅ Can see notes
- ✅ Delete button on each

#### 3.5 Delete Holiday
**Steps:**
1. Find existing holiday
2. Click "Eliminar"
3. Confirm in dialog

**Expected:**
- ✅ Confirmation dialog appears
- ✅ Delete only after confirmation
- ✅ Holiday removed from list
- ✅ Success toast

#### 3.6 Date Validation
**Steps:**
1. Try create with end date before start date
2. Try with same start/end date

**Expected:**
- ✅ End before start: error toast
- ✅ Same dates: error or allowed?
- ✅ Error message clear

#### 3.7 Holiday Blocks Availability
**Steps:**
1. Create holiday 2026-07-15 to 2026-07-20
2. From student account, try book session on 2026-07-17
3. Verify not bookable

**Expected:**
- ✅ Holiday dates unavailable in calendar picker
- ✅ Booking shows "Profesor en vacaciones"
- ✅ Cannot proceed with booking

#### 3.8 Recurring Holiday Application
**Steps:**
1. Create yearly holiday for Dec 25
2. Check next year (2027) - should apply

**Expected:**
- ✅ Booking system blocks 2027-12-25 too
- ✅ Recurring logic works
- ✅ Can override if needed

#### 3.9 Holiday Notes Display
**Steps:**
1. Create holiday with long notes (200+ chars)
2. Verify display

**Expected:**
- ✅ Notes fully visible or truncated/expandable
- ✅ Formatting preserved
- ✅ Readable layout

#### 3.10 Empty Holiday List
**Steps:**
1. Create new teacher account
2. Go to Vacaciones tab
3. No holidays exist

**Expected:**
- ✅ Empty state message
- ✅ Icon or illustration
- ✅ CTA to create first holiday

---

## 📊 Phase 5.4: Admin Analytics Tests

### Test Setup
```bash
# Login as Admin
# Navigate to AdminPanel → Analytics tab
```

### Test Cases

#### 4.1 Default 30-Day Range
**Steps:**
1. Open Analytics tab
2. Check date inputs

**Expected:**
- ✅ Start date = 30 days ago
- ✅ End date = today
- ✅ Data loads automatically
- ✅ No manual "Actualizar" needed initially

#### 4.2 Change Date Range
**Steps:**
1. Set start: 2026-05-01
2. Set end: 2026-05-15
3. Data updates

**Expected:**
- ✅ Date picker opens
- ✅ Can select any valid range
- ✅ End >= Start validation
- ✅ Data recalculates on change
- ✅ Metrics update with new range

#### 4.3 Revenue Metrics
**Steps:**
1. View "Ingresos Totales" card
2. Check format and accuracy

**Expected:**
- ✅ Shows total in currency format
- ✅ Successful payment count displays
- ✅ Format: $X,XXX.XX USD (or local)
- ✅ Matches actual data

#### 4.4 Success Rate
**Steps:**
1. View "Tasa de Éxito" card
2. Verify percentage

**Expected:**
- ✅ Shows % with 2 decimals
- ✅ 0-100 range
- ✅ Tooltip shows "Pagos procesados exitosamente"

#### 4.5 User Metrics
**Steps:**
1. Check "Estudiantes Activos" card
2. Check "Profesores" card

**Expected:**
- ✅ Active student count accurate
- ✅ New students this month accurate
- ✅ Total teachers matches database
- ✅ Churn rate calculated correctly

#### 4.6 Utilization Metrics
**Steps:**
1. View "Utilización" section
2. Check each metric:
   - Sesiones Promedio
   - Tasa de Finalización
   - Día de Mayor Demanda

**Expected:**
- ✅ Avg sessions per student accurate (total bookings / unique students)
- ✅ Completion rate % shows
- ✅ Peak day formatted as day name
- ✅ All metrics non-negative

#### 4.7 Plan Distribution
**Steps:**
1. View plan distribution table
2. Check each plan row

**Expected:**
- ✅ Plan names display correctly
- ✅ Active count (subscriptions) accurate
- ✅ Revenue calculated per plan
- ✅ Sorted by revenue descending
- ✅ Currency formatted

#### 4.8 Additional Stats
**Steps:**
1. View bottom section: Failed, Refunds, Churn

**Expected:**
- ✅ Failed payments count correct
- ✅ Refunded amount accurate
- ✅ Churn % calculated
- ✅ All values match revenue/user metrics

#### 4.9 No Data State
**Steps:**
1. Set range with no transactions/signups
2. Check display

**Expected:**
- ✅ Metrics show 0, not errors
- ✅ No crashes
- ✅ Graceful degradation

#### 4.10 Large Date Range
**Steps:**
1. Set range: 2026-01-01 to 2026-05-30
2. Check performance

**Expected:**
- ✅ Loads within 2-3 seconds
- ✅ No timeout
- ✅ Data accurate
- ✅ UI responsive

#### 4.11 Mobile Analytics
**Steps:**
1. Resize to mobile (375px width)
2. View analytics

**Expected:**
- ✅ Date inputs stack vertically
- ✅ Cards stack vertically
- ✅ Text readable
- ✅ No horizontal scroll
- ✅ Numbers truncated if needed

#### 4.12 Analytics Accuracy
**Steps:**
1. Manually count payments in database
2. Compare with UI total

**Expected:**
- ✅ Counts match exactly
- ✅ Revenue calculation correct
- ✅ Percentages accurate

---

## 🔐 Security & Performance Tests

### 4.13 Access Control
**Steps:**
1. Login as student
2. Try access /admin/analytics
3. Try access API directly

**Expected:**
- ✅ Redirect to dashboard (no 404)
- ✅ API returns 403 Unauthorized
- ✅ No data leakage

### 4.14 Data Aggregation Performance
**Steps:**
1. With 1000+ records in database
2. Load analytics

**Expected:**
- ✅ Completes in < 3 seconds
- ✅ No memory leaks
- ✅ Database queries optimized

---

## 🎯 Integration Tests

### 5.1 Messaging + Realtime
**Steps:**
1. Have 2 windows with chat open
2. Send message
3. Verify appears in both < 1s

**Expected:**
- ✅ Realtime delivery works
- ✅ No polling/refresh needed
- ✅ Notification shows

### 5.2 Availability + Holiday Interaction
**Steps:**
1. Create availability Mon 9-10
2. Create holiday Mon-Wed
3. Try book Mon 9am

**Expected:**
- ✅ Can't book Mon (holiday)
- ✅ Can book Tue if available
- ✅ Holiday takes precedence

### 5.3 Analytics + Payment System
**Steps:**
1. Process 5 test payments
2. Check analytics immediately

**Expected:**
- ✅ New payments appear in dashboard
- ✅ Revenue updates
- ✅ Success rate recalculated

### 5.4 Multiple User Types Flow
**Steps:**
1. Student: Send message, book class, view progress
2. Teacher: Receive message, see booking, edit availability
3. Admin: View analytics, manage promo codes

**Expected:**
- ✅ No crosstalk
- ✅ Data isolation maintained
- ✅ RLS policies working

---

## 📈 Test Results Checklist

### Phase 5.1: Messaging (/60 points)
- [ ] Send/receive messages (15)
- [ ] Conversation history (10)
- [ ] Unread counts (10)
- [ ] Realtime updates (15)
- [ ] Multiple conversations (10)

**Score: ___/60**

### Phase 5.2: Availability Editing (/50 points)
- [ ] Edit time (10)
- [ ] Edit capacity (8)
- [ ] Time validation (10)
- [ ] Cancel/Save flow (12)
- [ ] Edit history tracking (10)

**Score: ___/50**

### Phase 5.3: Holiday Management (/50 points)
- [ ] Create holidays (10)
- [ ] Recurring setup (10)
- [ ] Delete holidays (8)
- [ ] Block availability (12)
- [ ] Date validation (10)

**Score: ___/50**

### Phase 5.4: Analytics (/60 points)
- [ ] Revenue metrics (12)
- [ ] User metrics (12)
- [ ] Utilization (12)
- [ ] Plan distribution (12)
- [ ] Date filtering (12)

**Score: ___/60**

### Phase 5.5: Integration & Polish (/30 points)
- [ ] Cross-feature workflows (10)
- [ ] Performance (10)
- [ ] Mobile responsive (10)

**Score: ___/30**

---

## 📊 Summary

**Total Points: 250**

- **Pass Threshold:** 225+ (90%)
- **Target:** 240+ (96%)

**Overall Status:** [ ] Pass / [ ] Fail

**Date Tested:** _____________  
**Tester Name:** _____________  
**Browser:** _____________  
**Issues Found:** __________________

---

## 🐛 Known Issues

None currently identified.

---

## 🚀 Next Steps

1. Run automated test suite: `pnpm run test`
2. Manual E2E testing using this guide
3. Performance testing with Chrome DevTools
4. Security audit with burp/OWASP
5. Create PR for review

---

**Phase 5 Testing Complete** ✅


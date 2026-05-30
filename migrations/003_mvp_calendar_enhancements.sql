-- MVP Calendar Enhancements Migration
-- Date: 2026-05-30
-- Purpose: Support bulk availability, professional types, attendance tracking, and nutrition exemption

-- 1. Add professional_type to availability (kinesiologist | nutritionist | therapist)
ALTER TABLE availability
  ADD COLUMN IF NOT EXISTS professional_type VARCHAR(50) DEFAULT 'kinesiologist'
  CHECK (professional_type IN ('kinesiologist', 'nutritionist', 'therapist'));

-- 2. Add bulk_group_id to group availabilities created in bulk (for editing/deleting together)
ALTER TABLE availability
  ADD COLUMN IF NOT EXISTS bulk_group_id UUID;

-- 3. Add notes for reagendable info
ALTER TABLE availability
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Add attendance and charging tracking to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS attendance_confirmed_at TIMESTAMP;
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS charged_from_plan BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS charged_at TIMESTAMP;

-- 5. Add professional_type cache to bookings (for quick filtering)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS professional_type VARCHAR(50) DEFAULT 'kinesiologist';

-- 6. Add specialization to profiles (consistent with professional_type)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS professional_type VARCHAR(50) DEFAULT 'kinesiologist'
  CHECK (professional_type IN ('kinesiologist', 'nutritionist', 'therapist', NULL));

-- 7. Add default monthly classes count to plans (basic plan = 4 classes/month)
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS monthly_class_count INTEGER DEFAULT 4;

-- 8. Index for performance
CREATE INDEX IF NOT EXISTS idx_availability_professional_type
  ON availability(professional_type);
CREATE INDEX IF NOT EXISTS idx_bookings_attended
  ON bookings(attended);
CREATE INDEX IF NOT EXISTS idx_bookings_charged
  ON bookings(charged_from_plan);
CREATE INDEX IF NOT EXISTS idx_availability_bulk_group
  ON availability(bulk_group_id);

-- 9. RPC function: confirm attendance and decrement plan if applicable
CREATE OR REPLACE FUNCTION confirm_booking_attendance(
  p_booking_id UUID,
  p_attended BOOLEAN
) RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_plan_id UUID;
  v_consumed BOOLEAN := FALSE;
BEGIN
  -- Get booking with professional_type
  SELECT b.*, COALESCE(b.professional_type, a.professional_type, 'kinesiologist') as pro_type
  INTO v_booking
  FROM bookings b
  LEFT JOIN availability a ON
    a.professional_id = b.professional_id
    AND a.start_time = b.start_time
  WHERE b.id = p_booking_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Booking not found');
  END IF;

  -- Update attendance
  UPDATE bookings
  SET
    attended = p_attended,
    attendance_confirmed_at = NOW(),
    professional_type = v_booking.pro_type
  WHERE id = p_booking_id;

  -- If attended AND kinesiologist/therapist (NOT nutritionist) and not yet charged → consume plan
  IF p_attended
    AND v_booking.pro_type IN ('kinesiologist', 'therapist')
    AND COALESCE(v_booking.charged_from_plan, FALSE) = FALSE THEN

    -- Find active plan with remaining sessions
    SELECT id INTO v_plan_id
    FROM plans
    WHERE student_id = v_booking.student_id
      AND is_active = TRUE
      AND remaining_sessions > 0
    ORDER BY expiry_date ASC
    LIMIT 1;

    IF v_plan_id IS NOT NULL THEN
      -- Decrement remaining sessions
      UPDATE plans
      SET remaining_sessions = remaining_sessions - 1
      WHERE id = v_plan_id;

      -- Mark booking as charged
      UPDATE bookings
      SET
        charged_from_plan = TRUE,
        charged_at = NOW()
      WHERE id = p_booking_id;

      v_consumed := TRUE;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'attended', p_attended,
    'consumed_from_plan', v_consumed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RPC: bulk create availability slots
CREATE OR REPLACE FUNCTION create_bulk_availability(
  p_professional_id UUID,
  p_days INTEGER[],
  p_start_time TIME,
  p_end_time TIME,
  p_max_capacity INTEGER,
  p_professional_type VARCHAR DEFAULT 'kinesiologist',
  p_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_bulk_group_id UUID := gen_random_uuid();
  v_day INTEGER;
  v_inserted INTEGER := 0;
BEGIN
  FOREACH v_day IN ARRAY p_days LOOP
    BEGIN
      INSERT INTO availability(
        professional_id,
        day_of_week,
        start_time,
        end_time,
        max_capacity,
        professional_type,
        bulk_group_id,
        notes,
        is_holiday
      ) VALUES (
        p_professional_id,
        v_day,
        p_start_time,
        p_end_time,
        p_max_capacity,
        p_professional_type,
        v_bulk_group_id,
        p_notes,
        FALSE
      );
      v_inserted := v_inserted + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Skip duplicates
      NULL;
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'bulk_group_id', v_bulk_group_id,
    'inserted_count', v_inserted
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Update existing data: set professional_type from profiles.specialization if exists
UPDATE profiles
SET professional_type = CASE
  WHEN LOWER(specialization) LIKE '%nutri%' THEN 'nutritionist'
  WHEN LOWER(specialization) LIKE '%terap%' THEN 'therapist'
  ELSE 'kinesiologist'
END
WHERE specialization IS NOT NULL AND professional_type = 'kinesiologist';

-- 12. Update availability.professional_type from profiles
UPDATE availability a
SET professional_type = p.professional_type
FROM profiles p
WHERE a.professional_id = p.id
  AND p.professional_type IS NOT NULL
  AND a.professional_type = 'kinesiologist';

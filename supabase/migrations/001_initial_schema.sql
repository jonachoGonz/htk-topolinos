-- HTK Center MVP Schema Migration (CLEAN VERSION)
-- Execute this in Supabase SQL Editor

-- ============================================================================
-- DROP EXISTING TABLES (if they exist with wrong schema)
-- ============================================================================

DROP TABLE IF EXISTS progress_records CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS availability CASCADE;

-- ============================================================================
-- 1. EXPAND profiles TABLE
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================================
-- 2. CREATE availability TABLE
-- ============================================================================

CREATE TABLE availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 5,
  is_holiday BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(professional_id, day_of_week, start_time, end_time)
);

CREATE INDEX idx_availability_professional ON availability(professional_id);
CREATE INDEX idx_availability_day ON availability(day_of_week);

-- ============================================================================
-- 3. CREATE bookings TABLE (FRESH)
-- ============================================================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bookings_student ON bookings(student_id, booking_date);
CREATE INDEX idx_bookings_professional ON bookings(professional_id, booking_date);

-- ============================================================================
-- 4. CREATE plans TABLE
-- ============================================================================

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_sessions INTEGER NOT NULL,
  remaining_sessions INTEGER NOT NULL,
  expiry_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_plans_student ON plans(student_id, is_active);

-- ============================================================================
-- 5. CREATE progress_records TABLE
-- ============================================================================

CREATE TABLE progress_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  notes TEXT,
  metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_progress_patient ON progress_records(patient_id, record_date);
CREATE INDEX idx_progress_professional ON progress_records(professional_id);

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- availability: Professionals manage, students read
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profs_manage_availability" ON availability
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "students_read_availability" ON availability FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'student');

-- bookings: Own bookings + professionals see their bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_own_bookings" ON bookings
  USING (student_id = auth.uid());

CREATE POLICY "profs_see_their_bookings" ON bookings FOR SELECT
  USING (professional_id = auth.uid());

-- plans: Own plans only
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students_own_plans" ON plans
  USING (student_id = auth.uid());

-- progress_records: Own records
ALTER TABLE progress_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_sees_own" ON progress_records FOR SELECT
  USING (patient_id = auth.uid());

CREATE POLICY "prof_manages_own" ON progress_records
  USING (professional_id = auth.uid());

-- ============================================================================
-- DONE: Schema migration complete
-- ============================================================================

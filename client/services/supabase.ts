import { createClient } from "@supabase/supabase-js";
import type { User, Session } from "@supabase/supabase-js";

/**
 * Supabase Client - HTK Center
 * Uses environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables."
  );
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

export type UserRole = "teacher" | "student";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  session_id: string;
  status: "confirmed" | "absent" | "pending";
  created_at: string;
  updated_at: string;
}

export type ProfessionalType = "kinesiologist" | "nutritionist" | "therapist";

export interface BookingRecord {
  id: string;
  student_id: string;
  professional_id: string;
  booking_date: string;   // YYYY-MM-DD
  start_time: string;     // HH:MM:SS
  end_time: string;       // HH:MM:SS
  status: "confirmed" | "cancelled" | "completed";
  notes?: string;
  cancelled_at?: string;
  attended?: boolean;
  attendance_confirmed_at?: string;
  charged_from_plan?: boolean;
  charged_at?: string;
  professional_type?: ProfessionalType;
  created_at: string;
}

export interface Availability {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_holiday: boolean;
  professional_type?: ProfessionalType;
  bulk_group_id?: string;
  notes?: string;
  created_at: string;
}

export interface Plan {
  id: string;
  student_id: string;
  name: string;
  total_sessions: number;
  remaining_sessions: number;
  monthly_class_count?: number;
  expiry_date: string;
  is_active: boolean;
  created_at: string;
}

export interface ProfessionalProfile {
  id: string;
  full_name: string;
  email?: string;
  specialization?: string;
  professional_type?: ProfessionalType;
}

export interface ProgressRecord {
  id: string;
  patient_id: string;
  professional_id: string;
  record_date: string;
  notes: string;
  metrics?: Record<string, any>;
  created_at: string;
}

/**
 * Login teacher with email + password.
 */
export async function loginTeacher(
  email: string,
  password: string
): Promise<LoginResult> {
  if (!email || !password) {
    return { success: false, error: "Por favor completa todos los campos." };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "Authentication failed" };
    }

    return {
      success: true,
      user: { id: data.user.id, email, role: "teacher" },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Login student with email/RUT + password.
 */
export async function loginStudent(
  emailOrRut: string,
  password: string
): Promise<LoginResult> {
  if (!emailOrRut || !password) {
    return { success: false, error: "Por favor completa todos los campos." };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailOrRut,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: "Authentication failed" };
    }

    return {
      success: true,
      user: { id: data.user.id, email: emailOrRut, role: "student" },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Create or update attendance record
 */
export async function upsertAttendance(
  userId: string,
  sessionId: string,
  status: "confirmed" | "absent" | "pending"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("attendance").upsert(
      {
        user_id: userId,
        session_id: sessionId,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,session_id" }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Create booking record — usa el schema real de la tabla bookings
 */
export async function createBooking(
  studentId: string,
  professionalId: string,
  bookingDate: string,   // YYYY-MM-DD
  startTime: string,     // HH:MM
  endTime: string,       // HH:MM
  professionalType: ProfessionalType = "kinesiologist"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("bookings").insert({
      student_id: studentId,
      professional_id: professionalId,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      status: "confirmed",
      professional_type: professionalType,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Cancel booking record — actualiza status a 'cancelled'
 */
export async function cancelBooking(
  studentId: string,
  bookingDate: string,
  startTime: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
      })
      .eq("student_id", studentId)
      .eq("booking_date", bookingDate)
      .eq("start_time", startTime)
      .eq("status", "confirmed");

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get availability slots for a professional
 */
export async function getAvailability(
  professionalId: string
): Promise<{ success: boolean; data?: Availability[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("professional_id", professionalId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Create availability slot
 */
export async function createAvailability(
  professionalId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  maxCapacity: number,
  professionalType: ProfessionalType = "kinesiologist"
): Promise<{ success: boolean; error?: string }> {
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return { success: false, error: "Día inválido (0-6)" };
  }
  if (!startTime || !endTime) {
    return { success: false, error: "Por favor completa los horarios" };
  }
  if (maxCapacity < 1) {
    return { success: false, error: "Capacidad debe ser al menos 1" };
  }

  try {
    const { error } = await supabase.from("availability").insert({
      professional_id: professionalId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      max_capacity: maxCapacity,
      is_holiday: false,
      professional_type: professionalType,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Delete availability slot
 */
export async function deleteAvailability(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("availability")
      .delete()
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Update availability slot
 */
export async function updateAvailability(
  id: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  maxCapacity: number
): Promise<{ success: boolean; error?: string }> {
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    return { success: false, error: "Día inválido (0-6)" };
  }
  if (!startTime || !endTime) {
    return { success: false, error: "Por favor completa los horarios" };
  }
  if (maxCapacity < 1) {
    return { success: false, error: "Capacidad debe ser al menos 1" };
  }

  try {
    const { error } = await supabase
      .from("availability")
      .update({
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        max_capacity: maxCapacity,
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get bookings for a professional or student
 */
export async function getBookings(
  type: "professional" | "student",
  userId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    let query = supabase.from("bookings").select("*");

    if (type === "professional") {
      query = query.eq("professional_id", userId);
    } else {
      query = query.eq("student_id", userId);
    }

    const { data, error } = await query.order("booking_date", {
      ascending: false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get progress records for a patient
 */
export async function getProgressRecords(
  patientId: string
): Promise<{ success: boolean; data?: ProgressRecord[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("progress_records")
      .select("*")
      .eq("patient_id", patientId)
      .order("record_date", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Create a progress record
 */
export async function createProgressRecord(
  patientId: string,
  professionalId: string,
  notes: string,
  metrics?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  if (!notes) {
    return { success: false, error: "Las notas son requeridas" };
  }

  try {
    const { error } = await supabase.from("progress_records").insert({
      patient_id: patientId,
      professional_id: professionalId,
      record_date: new Date().toISOString(),
      notes,
      metrics: metrics || {},
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<{
    full_name: string;
    phone: string;
    specialization: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get student availability (teacher availability slots filtered for student view)
 */
export async function getStudentAvailability(
  _studentId: string,
  _weekStart: Date
): Promise<{ success: boolean; data?: Availability[]; error?: string }> {
  try {
    // La disponibilidad es recurrente semanal (día_de_semana + hora).
    // No filtramos por created_at sino que traemos todos los slots activos.
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("is_holiday", false)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get student's active plan
 */
export async function getStudentPlan(
  studentId: string
): Promise<{ success: boolean; data?: Plan; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || undefined };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get student's bookings with optional status filter
 */
export async function getStudentBookings(
  studentId: string,
  status?: "confirmed" | "cancelled" | "completed"
): Promise<{ success: boolean; data?: BookingRecord[]; error?: string }> {
  try {
    let query = supabase
      .from("bookings")
      .select("*")
      .eq("student_id", studentId);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("booking_date", {
      ascending: false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get student's plan history (past and current plans)
 */
export async function getPlanHistory(
  studentId: string
): Promise<{ success: boolean; data?: Plan[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Holiday interface
 */
export interface Holiday {
  id: string;
  professional_id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_recurring: boolean;
  recurring_type?: "yearly" | "monthly";
  notes?: string;
  created_at: string;
}

/**
 * Get holidays for a professional
 */
export async function getHolidays(
  professionalId: string
): Promise<{ success: boolean; data?: Holiday[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .eq("professional_id", professionalId)
      .order("start_date", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Create a holiday
 */
export async function createHoliday(
  professionalId: string,
  title: string,
  startDate: string,
  endDate: string,
  isRecurring: boolean,
  recurringType?: "yearly" | "monthly",
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!title || !startDate || !endDate) {
    return { success: false, error: "Por favor completa todos los campos" };
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return { success: false, error: "La fecha de inicio debe ser anterior a la de fin" };
  }

  try {
    const { error } = await supabase.from("holidays").insert({
      professional_id: professionalId,
      title,
      start_date: startDate,
      end_date: endDate,
      is_recurring: isRecurring,
      recurring_type: isRecurring ? recurringType : null,
      notes: notes || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a holiday
 */
export async function deleteHoliday(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("holidays").delete().eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Check if a date is a holiday for a professional
 */
export async function isDateHoliday(
  professionalId: string,
  date: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .eq("professional_id", professionalId)
      .lte("start_date", date)
      .gte("end_date", date);

    if (error) {
      console.error("Error checking holiday:", error);
      return false;
    }

    return (data && data.length > 0) || false;
  } catch (error) {
    console.error("Error checking holiday:", error);
    return false;
  }
}

/**
 * Sign out the current user
 */
export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

// ============================================
// MVP CALENDAR ENHANCEMENTS
// ============================================

/**
 * Bulk create availability slots for multiple days (Mon-Sun) at once.
 * Useful for setting up recurring weekly schedules in one action.
 */
export async function createBulkAvailability(
  professionalId: string,
  days: number[],
  startTime: string,
  endTime: string,
  maxCapacity: number,
  professionalType: ProfessionalType = "kinesiologist",
  notes?: string
): Promise<{ success: boolean; data?: { bulk_group_id: string; inserted_count: number }; error?: string }> {
  if (!days || days.length === 0) {
    return { success: false, error: "Selecciona al menos un día" };
  }
  if (!startTime || !endTime) {
    return { success: false, error: "Por favor completa los horarios" };
  }
  if (maxCapacity < 1) {
    return { success: false, error: "Capacidad debe ser al menos 1" };
  }

  try {
    // Try RPC first (preferred path with bulk_group_id)
    const { data: rpcData, error: rpcError } = await supabase.rpc("create_bulk_availability", {
      p_professional_id: professionalId,
      p_days: days,
      p_start_time: startTime,
      p_end_time: endTime,
      p_max_capacity: maxCapacity,
      p_professional_type: professionalType,
      p_notes: notes || null,
    });

    if (!rpcError && rpcData) {
      return { success: true, data: rpcData };
    }

    // Fallback: insert one-by-one client-side if RPC not available yet
    const bulkGroupId = crypto.randomUUID();
    const rows = days.map((day) => ({
      professional_id: professionalId,
      day_of_week: day,
      start_time: startTime,
      end_time: endTime,
      max_capacity: maxCapacity,
      is_holiday: false,
      professional_type: professionalType,
      bulk_group_id: bulkGroupId,
      notes: notes || null,
    }));

    const { error } = await supabase.from("availability").insert(rows);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: { bulk_group_id: bulkGroupId, inserted_count: rows.length } };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Delete all availability slots in a bulk_group (e.g., remove the whole weekly schedule)
 */
export async function deleteBulkAvailability(
  bulkGroupId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("availability")
      .delete()
      .eq("bulk_group_id", bulkGroupId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get all professionals (teachers) so a student can choose who to book with
 */
export async function getAllProfessionals(
  filterType?: ProfessionalType
): Promise<{ success: boolean; data?: ProfessionalProfile[]; error?: string }> {
  try {
    let query = supabase
      .from("profiles")
      .select("id, full_name, email, specialization, professional_type")
      .eq("role", "teacher");

    if (filterType) {
      query = query.eq("professional_type", filterType);
    }

    const { data, error } = await query.order("full_name", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get the bookings (students attending) for a specific availability slot on a specific date.
 * Joins with profiles to return student names.
 */
export async function getBookingsForSlot(
  professionalId: string,
  bookingDate: string,
  startTime: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        id, student_id, booking_date, start_time, end_time, status,
        attended, attendance_confirmed_at, charged_from_plan, charged_at,
        professional_type,
        student:profiles!bookings_student_id_fkey(id, full_name, email)
        `
      )
      .eq("professional_id", professionalId)
      .eq("booking_date", bookingDate)
      .eq("start_time", startTime)
      .eq("status", "confirmed");

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Confirm or unconfirm attendance for a booking.
 * If attended=true AND professional is kinesiologist/therapist (not nutritionist) AND not yet charged,
 * automatically deducts 1 session from the student's active plan.
 *
 * Tries an RPC first (atomic on server). Falls back to client-side multi-step update if RPC missing.
 */
export async function confirmBookingAttendance(
  bookingId: string,
  attended: boolean
): Promise<{ success: boolean; consumedFromPlan?: boolean; error?: string }> {
  try {
    // Preferred: RPC handles attendance + plan deduction atomically
    const { data: rpcData, error: rpcError } = await supabase.rpc("confirm_booking_attendance", {
      p_booking_id: bookingId,
      p_attended: attended,
    });

    if (!rpcError && rpcData) {
      return {
        success: true,
        consumedFromPlan: rpcData.consumed_from_plan === true,
      };
    }

    // Fallback: do it client-side
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, student_id, professional_id, professional_type, charged_from_plan, status")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return { success: false, error: fetchError?.message || "Booking no encontrado" };
    }

    // Update attendance
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        attended,
        attendance_confirmed_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) return { success: false, error: updateError.message };

    let consumedFromPlan = false;

    // Deduct from plan only if attended, NOT nutritionist, and not already charged
    if (
      attended &&
      booking.professional_type !== "nutritionist" &&
      !booking.charged_from_plan
    ) {
      const { data: plan, error: planError } = await supabase
        .from("plans")
        .select("id, remaining_sessions")
        .eq("student_id", booking.student_id)
        .eq("is_active", true)
        .gt("remaining_sessions", 0)
        .order("expiry_date", { ascending: true })
        .limit(1)
        .single();

      if (!planError && plan) {
        const { error: decError } = await supabase
          .from("plans")
          .update({ remaining_sessions: plan.remaining_sessions - 1 })
          .eq("id", plan.id);

        if (!decError) {
          await supabase
            .from("bookings")
            .update({ charged_from_plan: true, charged_at: new Date().toISOString() })
            .eq("id", bookingId);
          consumedFromPlan = true;
        }
      }
    }

    return { success: true, consumedFromPlan };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get availability for a specific professional, filtered to one professional only.
 * Used when a student selects a professional in the calendar.
 */
export async function getAvailabilityForProfessional(
  professionalId: string
): Promise<{ success: boolean; data?: Availability[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("professional_id", professionalId)
      .eq("is_holiday", false)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Check if a slot's start time is in the past (relative to the booking date).
 * Returns true if the slot has already started or finished.
 */
export function isSlotInPast(bookingDate: Date, startTime: string): boolean {
  const [hours, minutes] = startTime.split(":").map(Number);
  const slotDateTime = new Date(bookingDate);
  slotDateTime.setHours(hours, minutes, 0, 0);
  return slotDateTime.getTime() < Date.now();
}

/**
 * Check if cancellation is allowed for a booking (12-hour rule),
 * computed against the actual booking date (NOT today's date).
 */
export function canCancelBooking(
  bookingDate: Date,
  startTime: string,
  minHoursAdvance: number = 12
): { allowed: boolean; hoursLeft: number } {
  const [hours, minutes] = startTime.split(":").map(Number);
  const slotDateTime = new Date(bookingDate);
  slotDateTime.setHours(hours, minutes, 0, 0);

  const hoursDiff = (slotDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
  return {
    allowed: hoursDiff >= minHoursAdvance,
    hoursLeft: Math.max(0, Math.ceil(hoursDiff)),
  };
}

/**
 * Get cancellation rate at attended time
 */
export async function getRemainingPlanClasses(
  studentId: string
): Promise<{ success: boolean; remaining?: number; total?: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("plans")
      .select("remaining_sessions, total_sessions, monthly_class_count")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .order("expiry_date", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      remaining: data?.remaining_sessions ?? 0,
      total: data?.total_sessions ?? data?.monthly_class_count ?? 4,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

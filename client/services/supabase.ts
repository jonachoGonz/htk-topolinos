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
    let { error } = await supabase.from("bookings").insert({
      student_id: studentId,
      professional_id: professionalId,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      status: "confirmed",
      professional_type: professionalType,
    });

    // Fallback for legacy schema (no professional_type column yet)
    if (error && /column|schema cache/i.test(error.message)) {
      const retry = await supabase.from("bookings").insert({
        student_id: studentId,
        professional_id: professionalId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        status: "confirmed",
      });
      error = retry.error;
    }

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
    let { error } = await supabase.from("availability").insert({
      professional_id: professionalId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      max_capacity: maxCapacity,
      is_holiday: false,
      professional_type: professionalType,
    });

    // Fallback for legacy schema (no professional_type column yet)
    if (error && /column|schema cache/i.test(error.message)) {
      const retry = await supabase.from("availability").insert({
        professional_id: professionalId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        max_capacity: maxCapacity,
        is_holiday: false,
      });
      error = retry.error;
    }

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
    const rowsWithExtras = days.map((day) => ({
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

    let { error } = await supabase.from("availability").insert(rowsWithExtras);

    // If the new columns don't exist yet (migration not applied), retry with minimal columns
    if (error && /column|schema cache/i.test(error.message)) {
      const rowsMinimal = days.map((day) => ({
        professional_id: professionalId,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        max_capacity: maxCapacity,
        is_holiday: false,
      }));
      const retry = await supabase.from("availability").insert(rowsMinimal);
      error = retry.error;
    }

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: { bulk_group_id: bulkGroupId, inserted_count: days.length } };
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
      .select("id, full_name, specialization, professional_type")
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
        student:profiles!bookings_student_id_fkey(id, full_name)
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

// ============================================
// APP SETTINGS (singleton)
// ============================================

export interface AppSettings {
  id: number;
  center_name?: string;
  center_address?: string;
  center_phone?: string;
  center_email?: string;
  logo_url?: string;
  primary_color?: string;
  cancellation_hours?: number;
  default_class_capacity?: number;
  default_plan_duration_months?: number;
  operating_hours?: Record<string, [string, string]>; // {mon:[09:00,18:00]}
  welcome_message_student?: string;
  welcome_message_teacher?: string;
  email_reminder_hours_before?: number;
  stripe_publishable_key?: string;
  stripe_account_country?: string;
  default_currency?: string;
  extras?: Record<string, any>;
  updated_at?: string;
}

export async function getAppSettings(): Promise<{
  success: boolean; data?: AppSettings; error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("app_settings").select("*").eq("id", 1).single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as AppSettings };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function updateAppSettings(
  patch: Partial<AppSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const row: any = { ...patch, updated_at: new Date().toISOString() };
    delete row.id;
    const { error } = await supabase.from("app_settings").update(row).eq("id", 1);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: String(e) }; }
}

// ============================================
// DASHBOARD VIEWS (D)
// ============================================
export interface TodayOverview {
  professional_id: string;
  today_count: number;
  today_pending_attendance: number;
  week_count: number;
  active_students_30d: number;
}
export async function getTodayOverview(professionalId: string): Promise<{
  success: boolean; data?: TodayOverview; error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("today_overview").select("*")
      .eq("professional_id", professionalId).single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as TodayOverview };
  } catch (e) { return { success: false, error: String(e) }; }
}

export interface AdminOverview {
  total_students: number;
  paused_students: number;
  active_students: number;
  total_teachers: number;
  active_plans: number;
  bookings_next_7_days: number;
  bookings_this_month: number;
  attended_this_month: number;
  revenue_this_month: number;
}
export async function getAdminOverview(): Promise<{
  success: boolean; data?: AdminOverview; error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("admin_overview").select("*").single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as AdminOverview };
  } catch (e) { return { success: false, error: String(e) }; }
}

export interface PlanDistributionRow {
  template_id: string;
  template_name: string;
  monthly_classes: number;
  active_subscriptions: number;
  total_remaining_sessions: number;
}
export async function getPlanDistribution(): Promise<{
  success: boolean; data?: PlanDistributionRow[]; error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("plan_distribution").select("*");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as PlanDistributionRow[]) || [] };
  } catch (e) { return { success: false, error: String(e) }; }
}

// ============================================
// TEACHER PROFILE (C)
// ============================================
export interface Certification {
  title: string;
  issuer?: string;
  year?: number;
  url?: string;
}
export interface SocialLinks {
  instagram?: string;
  linkedin?: string;
  web?: string;
}
export interface TeacherProfile extends Partial<PatientProfile> {
  bio?: string;
  years_experience?: number;
  education?: string;
  certifications?: Certification[];
  specialties?: string[];
  languages?: string[];
  social_links?: SocialLinks;
  show_in_directory?: boolean;
}

export async function getTeacherProfile(id: string): Promise<{
  success: boolean; data?: TeacherProfile; error?: string;
}> {
  try {
    const { data, error } = await supabase.from("profiles").select("*")
      .eq("id", id).single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as TeacherProfile };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function updateTeacherProfile(
  id: string, patch: Partial<TeacherProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    const row: any = { ...patch, updated_at: new Date().toISOString() };
    delete row.id; delete row.role; delete row.is_admin;
    const { error } = await supabase.from("profiles").update(row).eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function getProfessionalsDirectory(): Promise<{
  success: boolean; data?: TeacherProfile[]; error?: string;
}> {
  try {
    const { data, error } = await supabase.from("profiles")
      .select("id, full_name, photo_url, bio, professional_type, specialties, years_experience, languages, social_links")
      .eq("role", "teacher").eq("show_in_directory", true)
      .order("full_name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as TeacherProfile[]) || [] };
  } catch (e) { return { success: false, error: String(e) }; }
}

// ============================================
// PATIENT MANAGEMENT
// ============================================

export type Handedness = "diestro" | "zurdo" | "ambidiestro";
export type ActivityLevel =
  | "sedentario" | "ligero" | "moderado" | "activo" | "muy_activo" | "atleta";
export type BloodType =
  | "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type MaritalStatus =
  | "soltero" | "casado" | "conviviente" | "divorciado" | "viudo" | "otro";

export interface SportEntry {
  name: string;
  since?: string; // YYYY-MM or YYYY
  frequency_per_week?: number;
}
export interface SubstanceEntry {
  name: string;
  frequency?: string;
  since?: string;
}
export interface MedicationEntry {
  name: string;
  dose?: string;
  frequency?: string;
  since?: string;
}

export interface PatientProfile {
  id: string;
  full_name: string;
  email?: string;
  rut_dni?: string;
  birth_date?: string;
  gender?: string;
  marital_status?: MaritalStatus | string;
  has_children?: boolean;
  num_children?: number;
  phone?: string;
  address?: string;
  profession?: string;
  occupation?: string;
  photo_url?: string;
  height_cm?: number;
  weight_kg?: number;
  body_fat_pct?: number;
  muscle_mass_pct?: number;
  bone_mass_pct?: number;
  // Body measurements (circumferences)
  waist_cm?: number;
  hip_cm?: number;
  chest_cm?: number;
  arm_cm?: number;
  thigh_cm?: number;
  calf_cm?: number;
  // PAR-Q
  parq_completed_at?: string;
  parq_answers?: Record<string, boolean>;
  parq_cleared?: boolean;
  parq_clearance_notes?: string;
  activity_level?: ActivityLevel | string;
  objective?: string;
  handedness?: Handedness | string;
  blood_type?: BloodType | string;
  allergies?: string;
  diseases?: string[];
  surgeries?: string;
  ailments?: string;
  injuries?: string;
  sports?: SportEntry[];
  drugs?: SubstanceEntry[];
  medications?: MedicationEntry[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  medical_info_extra?: string;
  personal_info_extra?: string;
  insurer?: string;
  joined_at?: string;
  referral_source?: string;
  informed_consent_signed?: boolean;
  is_paused?: boolean;
  paused_at?: string;
  pause_reason?: string;
  pause_resume_at?: string;
  role?: "student" | "teacher";
  is_admin?: boolean;
  professional_type?: ProfessionalType;
}

const PATIENT_FIELDS = `
  id, full_name, email, rut_dni, birth_date, gender, marital_status,
  has_children, num_children, phone, address, profession, occupation, photo_url,
  height_cm, weight_kg, body_fat_pct, muscle_mass_pct, bone_mass_pct,
  waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm, calf_cm,
  parq_completed_at, parq_answers, parq_cleared, parq_clearance_notes,
  activity_level, objective, handedness,
  blood_type, allergies, diseases, surgeries, ailments, injuries,
  sports, drugs, medications,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  medical_info_extra, personal_info_extra,
  insurer, joined_at, referral_source, informed_consent_signed,
  is_paused, paused_at, pause_reason, pause_resume_at,
  role, is_admin, professional_type
`;

export async function getPatient(
  id: string
): Promise<{ success: boolean; data?: PatientProfile; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(PATIENT_FIELDS)
      .eq("id", id)
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as PatientProfile };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getAllPatients(): Promise<{
  success: boolean;
  data?: PatientProfile[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(PATIENT_FIELDS)
      .eq("role", "student")
      .order("full_name", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as PatientProfile[]) || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updatePatient(
  id: string,
  updates: Partial<PatientProfile>
): Promise<{ success: boolean; error?: string }> {
  try {
    const row: any = { ...updates, updated_at: new Date().toISOString() };
    // Strip read-only fields
    delete row.id;
    delete row.role;
    delete row.is_admin;
    const { error } = await supabase.from("profiles").update(row).eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function createPatientProfile(
  payload: { id?: string; full_name: string; email?: string; rut_dni?: string; phone?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = payload.id || crypto.randomUUID();
    const { data, error } = await supabase.rpc("admin_upsert_patient", {
      p_id: id,
      p_full_name: payload.full_name,
      p_email: payload.email || null,
      p_rut_dni: payload.rut_dni || null,
      p_phone: payload.phone || null,
    });
    if (error) return { success: false, error: error.message };
    if (data && data.success === false)
      return { success: false, error: data.error };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deletePatient(
  id: string
): Promise<{ success: boolean; error?: string }> {
  // Soft delete: pause and mark inactive in any plans
  try {
    await supabase
      .from("plans")
      .update({ is_active: false })
      .eq("student_id", id);

    const { error } = await supabase
      .from("profiles")
      .update({
        is_paused: true,
        pause_reason: "Eliminado por admin",
        paused_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function setPatientPause(
  patientId: string,
  paused: boolean,
  reason?: string,
  resumeAt?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("admin_set_patient_pause", {
      p_patient_id: patientId,
      p_paused: paused,
      p_reason: reason || null,
      p_resume_at: resumeAt || null,
    });
    if (error) return { success: false, error: error.message };
    if (data && data.success === false)
      return { success: false, error: data.error };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ----- Patient notes (teacher/admin only) -----
export interface PatientNote {
  id: string;
  patient_id: string;
  author_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  author?: { id: string; full_name?: string };
}

export async function getPatientNotes(
  patientId: string
): Promise<{ success: boolean; data?: PatientNote[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("patient_notes")
      .select("*, author:profiles!patient_notes_author_id_fkey(id, full_name)")
      .eq("patient_id", patientId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as PatientNote[]) || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function addPatientNote(
  patientId: string,
  content: string,
  isPinned = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return { success: false, error: "No autenticado" };
    const { error } = await supabase.from("patient_notes").insert({
      patient_id: patientId,
      author_id: u.id,
      content,
      is_pinned: isPinned,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deletePatientNote(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("patient_notes").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ----- Attendance stats (view) -----
export interface PatientAttendance {
  patient_id: string;
  full_name?: string;
  confirmed_count: number;
  attended_count: number;
  absent_count: number;
  attendance_rate_pct?: number;
  last_attended_session?: string;
  last_scheduled_session?: string;
}

export async function getPatientAttendance(
  patientId: string
): Promise<{ success: boolean; data?: PatientAttendance; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("patient_attendance_stats")
      .select("*")
      .eq("patient_id", patientId)
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as PatientAttendance };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getAllPatientsAttendance(): Promise<{
  success: boolean;
  data?: PatientAttendance[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("patient_attendance_stats")
      .select("*");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as PatientAttendance[]) || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ----- Computed helpers -----
export function computeAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function computeBMI(heightCm?: number, weightKg?: number): number | null {
  if (!heightCm || !weightKg || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

export function bmiCategory(bmi: number | null): string {
  if (bmi === null) return "—";
  if (bmi < 18.5) return "Bajo peso";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Sobrepeso";
  if (bmi < 35) return "Obesidad I";
  if (bmi < 40) return "Obesidad II";
  return "Obesidad III";
}

// ============================================
// PLAN TEMPLATES (ADMIN)
// ============================================

export type RenewalPeriod = "monthly" | "trimestral" | "semestral" | "anual";
export type SessionType = "terapia" | "kinesiologia" | "nutricional" | "otra";

export interface PlanTemplate {
  id: string;
  professional_id?: string;
  name: string;
  description?: string;
  description_rich?: string;
  monthly_classes: number;
  sessions_per_month?: number;
  allowed_renewals: RenewalPeriod[];
  prices: {
    monthly: number;
    trimestral: number;
    semestral: number;
    anual: number;
  };
  accepts_discount_codes: boolean;
  discount_code?: string | null;
  includes_sessions: boolean;
  session_count_monthly: number;
  session_type?: SessionType | null;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function getPlanTemplates(
  includeInactive = false
): Promise<{ success: boolean; data?: PlanTemplate[]; error?: string }> {
  try {
    let query = supabase.from("plan_templates").select("*");
    if (!includeInactive) query = query.eq("is_active", true);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function createPlanTemplate(
  payload: Omit<PlanTemplate, "id" | "created_at" | "updated_at">
): Promise<{ success: boolean; data?: PlanTemplate; error?: string }> {
  try {
    // Map to DB columns (sessions_per_month is legacy required column)
    const row: any = {
      name: payload.name,
      description: payload.description ?? null,
      description_rich: payload.description_rich ?? null,
      monthly_classes: payload.monthly_classes,
      sessions_per_month: payload.monthly_classes, // mirror for legacy
      allowed_renewals: payload.allowed_renewals,
      prices: payload.prices,
      price_per_month: payload.prices.monthly, // legacy column
      accepts_discount_codes: payload.accepts_discount_codes,
      discount_code: payload.accepts_discount_codes ? payload.discount_code : null,
      includes_sessions: payload.includes_sessions,
      session_count_monthly: payload.includes_sessions ? payload.session_count_monthly : 0,
      session_type: payload.includes_sessions ? payload.session_type : null,
      is_active: payload.is_active,
      is_default: payload.is_default,
      professional_id: payload.professional_id ?? null,
    };

    const { data, error } = await supabase
      .from("plan_templates")
      .insert(row)
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updatePlanTemplate(
  id: string,
  updates: Partial<Omit<PlanTemplate, "id" | "created_at">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const row: any = { ...updates, updated_at: new Date().toISOString() };
    if (typeof updates.monthly_classes === "number") {
      row.sessions_per_month = updates.monthly_classes;
    }
    if (updates.prices && typeof updates.prices.monthly === "number") {
      row.price_per_month = updates.prices.monthly;
    }
    if (updates.accepts_discount_codes === false) {
      row.discount_code = null;
    }
    if (updates.includes_sessions === false) {
      row.session_count_monthly = 0;
      row.session_type = null;
    }

    const { error } = await supabase
      .from("plan_templates")
      .update(row)
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deletePlanTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Soft-delete: mark inactive instead of hard delete (preserves history)
    const { error } = await supabase
      .from("plan_templates")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function setDefaultPlanTemplate(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Unset existing default
    await supabase
      .from("plan_templates")
      .update({ is_default: false })
      .eq("is_default", true);

    // Set new default
    const { error } = await supabase
      .from("plan_templates")
      .update({ is_default: true })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================
// ADMIN PLAN ASSIGNMENT
// ============================================

export async function getStudents(): Promise<{
  success: boolean;
  data?: Array<{ id: string; full_name: string; email?: string }>;
  error?: string;
}> {
  try {
    // profiles table doesn't have email; email lives in auth.users (not directly queryable from client).
    // Return id + full_name; email can be fetched separately via admin RPC if needed.
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "student")
      .order("full_name", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function assignPlanToStudent(
  studentId: string,
  planTemplateId: string,
  durationMonths: number = 1
): Promise<{ success: boolean; error?: string }> {
  try {
    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_assign_plan_to_student", {
      p_student_id: studentId,
      p_plan_template_id: planTemplateId,
      p_duration_months: durationMonths,
    });

    if (!rpcError && rpcData?.success) {
      return { success: true };
    }

    // Fallback client-side
    const { data: template, error: tplErr } = await supabase
      .from("plan_templates")
      .select("name, monthly_classes")
      .eq("id", planTemplateId)
      .single();

    if (tplErr || !template) {
      return { success: false, error: tplErr?.message || "Template not found" };
    }

    // Deactivate existing
    await supabase
      .from("plans")
      .update({ is_active: false })
      .eq("student_id", studentId)
      .eq("is_active", true);

    // Insert new
    const totalSessions = template.monthly_classes * durationMonths;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + durationMonths);

    const { error: insErr } = await supabase.from("plans").insert({
      student_id: studentId,
      name: template.name,
      total_sessions: totalSessions,
      remaining_sessions: totalSessions,
      monthly_class_count: template.monthly_classes,
      expiry_date: expiry.toISOString().split("T")[0],
      is_active: true,
    });

    if (insErr) return { success: false, error: insErr.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
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

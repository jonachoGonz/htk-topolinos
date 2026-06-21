import { createClient } from "@supabase/supabase-js";
import type { User, Session } from "@supabase/supabase-js";
import type {
  Skinfolds, Habits, MaxHrZones, PainAssessment, EvaluationObjectives,
} from "@/lib/evaluations";

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
  has_nutrition_tracking?: boolean;
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
/**
 * Create N bookings: 1 normal + (repeatWeeks-1) extra at +7d each.
 * Returns count created.
 */
export async function createRecurringBookings(
  studentId: string,
  professionalId: string,
  baseBookingDate: string,   // YYYY-MM-DD
  startTime: string,
  endTime: string,
  professionalType: ProfessionalType,
  repeatWeeks: number
): Promise<{ success: boolean; created: number; error?: string }> {
  let created = 0;
  for (let w = 0; w < repeatWeeks; w++) {
    const d = new Date(baseBookingDate + "T00:00:00");
    d.setDate(d.getDate() + 7 * w);
    const dateStr = d.toISOString().split("T")[0];
    const r = await createBooking(studentId, professionalId, dateStr, startTime, endTime, professionalType);
    if (r.success) created++;
  }
  return { success: created > 0, created };
}

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
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("id");

    if (error) {
      return { success: false, error: error.message };
    }
    if (!data || data.length === 0) {
      return { success: false, error: "Sin permisos para actualizar el perfil. Recarga la sesión." };
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
 * Fetch the professional's schedule for a date range, joining each booking
 * with the student profile and the underlying availability slot so the UI can
 * render "X/Y cupos" + the student list per slot in one round trip.
 *
 * Returns slots grouped by (booking_date, start_time). One row per slot, with
 * an array of bookings inside.
 */
export interface ScheduleSlot {
  date: string;            // YYYY-MM-DD
  day_of_week: number;     // 0=Mon..6=Sun (DB convention)
  start_time: string;      // HH:MM:SS or HH:MM
  end_time: string;
  professional_type: "kinesiologist" | "nutritionist" | "therapist" | string;
  capacity: number;        // from availability.max_capacity (0 if not found)
  booked: number;          // bookings.length
  attended_count: number;  // bookings with attended=true
  pending_attendance: number; // bookings with attended IS NULL
  bookings: Array<{
    id: string;
    student_id: string;
    student_name: string;
    attended: boolean | null;
    charged_from_plan: boolean | null;
    status: string;
  }>;
}

export async function getProfessionalSchedule(
  professionalId: string,
  fromDate: string, // YYYY-MM-DD inclusive
  toDate: string,   // YYYY-MM-DD inclusive
): Promise<{ success: boolean; data?: ScheduleSlot[]; error?: string }> {
  try {
    // 1) Bookings in the range — no embedded join (FK name not consistent
    //    across environments). Fetch profiles separately and merge below.
    const { data: rows, error } = await supabase
      .from("bookings")
      .select(
        `id, student_id, booking_date, start_time, end_time, status,
         attended, charged_from_plan, professional_type`,
      )
      .eq("professional_id", professionalId)
      .gte("booking_date", fromDate)
      .lte("booking_date", toDate)
      .eq("status", "confirmed")
      .order("booking_date", { ascending: true })
      .order("start_time", { ascending: true });
    if (error) return { success: false, error: error.message };

    // 1b) Fetch student names in bulk (Teachers RLS policy allows reading them)
    const studentIds = Array.from(new Set((rows || []).map((r: any) => r.student_id))).filter(Boolean);
    const nameById = new Map<string, string>();
    if (studentIds.length > 0) {
      const { data: studentRows } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      (studentRows || []).forEach((p: any) => nameById.set(p.id, p.full_name));
    }

    // 2) Recurring availabilities for capacity lookup, keyed by (day_of_week, HH:MM)
    const { data: avail } = await supabase
      .from("availability")
      .select("day_of_week, start_time, max_capacity, professional_type")
      .eq("professional_id", professionalId);

    const capMap = new Map<string, { capacity: number; type: string }>();
    (avail || []).forEach((a: any) => {
      const key = `${a.day_of_week}|${String(a.start_time).slice(0, 5)}`;
      capMap.set(key, {
        capacity: a.max_capacity ?? 0,
        type: a.professional_type ?? "kinesiologist",
      });
    });

    // 3) Group bookings by (date, start_time)
    type Group = ScheduleSlot;
    const groups = new Map<string, Group>();

    for (const b of rows || []) {
      const date: string = b.booking_date;
      const start: string = String(b.start_time).slice(0, 5);
      const key = `${date}|${start}`;
      // Convert JS getDay (0=Sun..6=Sat) to DB convention (0=Mon..6=Sun)
      const jsDow = new Date(date + "T00:00:00").getDay();
      const dow = jsDow === 0 ? 6 : jsDow - 1;
      const capKey = `${dow}|${start}`;
      const cap = capMap.get(capKey);

      let g = groups.get(key);
      if (!g) {
        g = {
          date,
          day_of_week: dow,
          start_time: start,
          end_time: String(b.end_time).slice(0, 5),
          professional_type:
            b.professional_type || cap?.type || "kinesiologist",
          capacity: cap?.capacity ?? 0,
          booked: 0,
          attended_count: 0,
          pending_attendance: 0,
          bookings: [],
        };
        groups.set(key, g);
      }
      g.bookings.push({
        id: b.id,
        student_id: b.student_id,
        student_name: nameById.get(b.student_id) ?? "Sin nombre",
        attended: b.attended ?? null,
        charged_from_plan: b.charged_from_plan ?? null,
        status: b.status,
      });
      g.booked += 1;
      if (b.attended === true) g.attended_count += 1;
      else if (b.attended === null || b.attended === undefined) g.pending_attendance += 1;
    }

    // Sort by date then start_time
    const sorted = Array.from(groups.values()).sort((a, b) =>
      a.date === b.date ? a.start_time.localeCompare(b.start_time) : a.date.localeCompare(b.date),
    );

    return { success: true, data: sorted };
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
// MESSAGING (G)
// ============================================
export interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at?: string;
  created_at: string;
}

export interface MessageThread {
  other_user_id: string;
  other_user_name: string;
  other_user_photo?: string;
  other_user_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export async function listMessageThreads(): Promise<{
  success: boolean; data?: MessageThread[]; error?: string;
}> {
  try {
    const { data, error } = await supabase.rpc("list_message_threads");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as MessageThread[]) || [] };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function getMessagesWith(
  otherUserId: string
): Promise<{ success: boolean; data?: MessageRow[]; error?: string }> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user?.id) return { success: false, error: "No autenticado" };
    const me = u.user.id;
    const { data, error } = await supabase
      .from("messages").select("*")
      .or(`and(sender_id.eq.${me},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${me})`)
      .order("created_at", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as MessageRow[]) || [] };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function sendMessage(
  recipientId: string, body: string
): Promise<{ success: boolean; data?: MessageRow; error?: string }> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user?.id) return { success: false, error: "No autenticado" };
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: u.user.id, recipient_id: recipientId, body })
      .select("*").single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as MessageRow };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function markThreadRead(otherUserId: string): Promise<{ success: boolean }> {
  try {
    await supabase.rpc("mark_thread_read", { p_other_id: otherUserId });
    return { success: true };
  } catch { return { success: false }; }
}

export function subscribeToMessagesWith(
  myId: string, otherId: string, onNew: (m: MessageRow) => void
): () => void {
  const channel = supabase
    .channel(`messages:${myId}-${otherId}`)
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const m = payload.new as MessageRow;
        if (
          (m.sender_id === myId && m.recipient_id === otherId) ||
          (m.sender_id === otherId && m.recipient_id === myId)
        ) onNew(m);
      })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ============================================
// NOTIFICATIONS (B)
// ============================================
export type NotificationType =
  | "booking_reminder" | "plan_expiry" | "plan_purchased" | "plan_assigned"
  | "booking_cancelled" | "class_reagendar" | "patient_paused"
  | "new_signup" | "booking_attended" | "admin_message" | "new_booking";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  body?: string;
  link?: string;
  metadata?: any;
  read_at?: string;
  created_at: string;
  email_sent_at?: string;
}

export async function getNotifications(limit = 30): Promise<{
  success: boolean; data?: AppNotification[]; error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("notifications").select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as AppNotification[]) || [] };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function getUnreadCount(): Promise<{ success: boolean; count: number }> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user?.id) return { success: true, count: 0 };
    const { count, error } = await supabase
      .from("notifications").select("id", { count: "exact", head: true })
      .is("read_at", null)
      .eq("user_id", u.user.id);
    if (error) return { success: false, count: 0 };
    return { success: true, count: count || 0 };
  } catch { return { success: false, count: 0 }; }
}

export async function markNotificationRead(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("notifications").update({ read_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user?.id) return { success: false };
    await supabase.from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", u.user.id);
    return { success: true };
  } catch { return { success: false }; }
}

export async function createNotificationForUser(
  userId: string, type: string, title: string, body?: string, link?: string, metadata?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc("create_notification", {
      p_user_id: userId, p_type: type, p_title: title,
      p_body: body || null, p_link: link || null, p_metadata: metadata || {},
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: String(e) }; }
}

/** Subscribe to realtime new notifications for the current user. */
export function subscribeToNotifications(
  userId: string,
  onNew: (n: AppNotification) => void
): () => void {
  const channel = supabase.channel(`notifications:${userId}`)
    .on("postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload) => onNew(payload.new as AppNotification)
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ============================================
// REAGENDAR (H)
// ============================================
export interface AffectedBooking {
  booking_id: string;
  student_id: string;
  student_name?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
}
export async function getBookingsAffectedByHoliday(
  professionalId: string, startDate: string, endDate: string
): Promise<{ success: boolean; data?: AffectedBooking[]; error?: string }> {
  try {
    const { data, error } = await supabase.rpc("bookings_affected_by_holiday", {
      p_professional_id: professionalId,
      p_start_date: startDate,
      p_end_date: endDate,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as AffectedBooking[]) || [] };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function cancelBookingsAndNotify(
  bookings: AffectedBooking[], reason: string
): Promise<{ success: boolean; cancelled: number; notified: number; error?: string }> {
  let cancelled = 0;
  let notified = 0;
  try {
    for (const b of bookings) {
      const { error } = await supabase.from("bookings")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString(), notes: reason })
        .eq("id", b.booking_id);
      if (!error) {
        cancelled++;
        await createNotificationForUser(
          b.student_id,
          "class_reagendar",
          "Tu clase fue cancelada por el profesional",
          `Tu clase del ${b.booking_date} a las ${b.start_time.slice(0,5)} fue cancelada. Motivo: ${reason}. Te invitamos a reagendar.`,
          "/dashboard/student",
          { original_booking: b.booking_id }
        );
        notified++;
      }
    }
    return { success: true, cancelled, notified };
  } catch (e) { return { success: false, cancelled, notified, error: String(e) }; }
}

// ============================================
// ONBOARDING (F)
// ============================================
export interface OnboardingState {
  completed: boolean;
  steps: Record<string, boolean>;
  missingFields: string[];
}

export async function getOnboardingState(
  userId: string
): Promise<{ success: boolean; data?: OnboardingState; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed_at, onboarding_steps, full_name, birth_date, rut_dni, phone, parq_completed_at, parq_cleared, informed_consent_signed")
      .eq("id", userId).single();
    if (error) return { success: false, error: error.message };

    const steps: Record<string, boolean> = data.onboarding_steps || {};
    const missingFields: string[] = [];
    if (!data.full_name) missingFields.push("full_name");
    if (!data.birth_date) missingFields.push("birth_date");
    if (!data.phone) missingFields.push("phone");
    if (!data.parq_completed_at) missingFields.push("parq");
    if (!data.informed_consent_signed) missingFields.push("informed_consent_signed");

    return {
      success: true,
      data: {
        completed: !!data.onboarding_completed_at,
        steps,
        missingFields,
      },
    };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function markOnboardingCompleted(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("profiles")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: String(e) }; }
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
  tagline?: string;
  // Social / contact
  instagram_url?: string;
  tiktok_handle?: string;
  facebook_url?: string;
  whatsapp_phone?: string;
  google_maps_url?: string;
  // Policies
  cancellation_hours?: number;
  default_class_capacity?: number;
  default_plan_duration_months?: number;
  operating_hours?: Record<string, [string, string]>;
  // Messages
  welcome_message_student?: string;
  welcome_message_teacher?: string;
  email_reminder_hours_before?: number;
  // Payments
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
    const row: any = { ...patch };
    delete row.id; delete row.role; delete row.is_admin; delete row.updated_at;
    const { data, error } = await supabase.from("profiles").update(row).eq("id", id).select("id");
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) return { success: false, error: "Sin permisos para actualizar este perfil. Recarga la sesión." };
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
  socio_number?: string;
  social_media_handle?: string;
  // PAR-Q
  parq_completed_at?: string;
  parq_answers?: Record<string, boolean>;
  parq_cleared?: boolean;
  parq_clearance_notes?: string;
  handedness?: Handedness | string;
  blood_type?: BloodType | string;
  health_center?: string;
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
  social_media_consent?: boolean;
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
  socio_number, social_media_handle,
  parq_completed_at, parq_answers, parq_cleared, parq_clearance_notes,
  handedness,
  blood_type, health_center, allergies, diseases, surgeries, ailments, injuries,
  sports, drugs, medications,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
  medical_info_extra, personal_info_extra,
  insurer, joined_at, referral_source, informed_consent_signed, social_media_consent,
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

export async function getAllPatients(
  roleFilter: "student" | "teacher" = "student",
): Promise<{
  success: boolean;
  data?: PatientProfile[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(PATIENT_FIELDS)
      .eq("role", roleFilter)
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
    const row: any = { ...updates };
    // Strip read-only / non-updatable fields
    delete row.id;
    delete row.role;
    delete row.is_admin;
    delete row.updated_at;
    const { data, error } = await supabase.from("profiles").update(row).eq("id", id).select("id");
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) return { success: false, error: "Sin permisos para actualizar el perfil. Recarga la sesión." };
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

/**
 * Admin: create a brand-new patient (auth.user + profile).
 * Calls a Netlify Function that uses the service role key on the server.
 * Falls back to a clear error message if env is not configured.
 */
export async function adminCreatePatient(payload: {
  full_name: string;
  email: string;
  phone?: string;
  rut_dni?: string;
  password?: string;
  send_invite?: boolean;
  /**
   * "student" (default) o "teacher". Cuando es teacher la cuenta se crea
   * con role='teacher' en profiles. El admin puede usar este flag para
   * dar de alta profesionales del centro.
   */
  role?: "student" | "teacher";
}): Promise<{ success: boolean; user_id?: string; error?: string }> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) return { success: false, error: "No estás autenticado" };

    const res = await fetch("/.netlify/functions/admin-create-patient", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 502 from Netlify usually means the function never executed —
      // typical cause is missing SUPABASE_SERVICE_ROLE_KEY / SUPABASE_URL
      // env vars in the Netlify site config.
      let msg = json.error || `HTTP ${res.status}`;
      if (res.status === 502 && !json.error) {
        msg =
          "La función serverless de creación no respondió. Revisa que " +
          "SUPABASE_SERVICE_ROLE_KEY y SUPABASE_URL estén configuradas " +
          "en Netlify → Site settings → Environment variables.";
      } else if (res.status === 401 || res.status === 403) {
        // Si el servidor mandó detalle (json.error), úsalo — trae info de
        // diagnóstico como "Tu cuenta: X · is_admin=Y · profile_found=Z".
        // Solo caemos al mensaje genérico si no llegó body.
        if (!json.error) {
          msg = "No tienes permisos para crear pacientes (se requiere admin).";
        }
      }
      return { success: false, error: msg };
    }
    return { success: true, user_id: json.user_id };
  } catch (e) {
    return { success: false, error: String(e) };
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
  show_on_landing?: boolean;
  display_order?: number;
  highlight?: boolean;
  badge_text?: string | null;
  has_nutrition_tracking?: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Public: fetch active + visible plans for the landing page, ordered. */
export async function getPublicPlans(): Promise<{
  success: boolean; data?: PlanTemplate[]; error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("plan_templates")
      .select("*")
      .eq("is_active", true)
      .eq("show_on_landing", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as PlanTemplate[]) || [] };
  } catch (e) { return { success: false, error: String(e) }; }
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

/**
 * Delete a plan template.
 * - `hard: false` (default) → soft-delete (is_active=false). Preserves history.
 * - `hard: true` → permanent DELETE. Use only when the plan is already inactive
 *   AND the admin explicitly opts in (double confirm in UI).
 */
export async function deletePlanTemplate(
  id: string,
  opts: { hard?: boolean } = {},
): Promise<{ success: boolean; error?: string }> {
  try {
    if (opts.hard) {
      const { error } = await supabase
        .from("plan_templates")
        .delete()
        .eq("id", id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
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
    // Fetch template flags up front so both RPC and fallback paths can
    // carry has_nutrition_tracking forward without depending on the RPC
    // signature.
    const { data: template, error: tplErr } = await supabase
      .from("plan_templates")
      .select("name, monthly_classes, has_nutrition_tracking")
      .eq("id", planTemplateId)
      .single();

    if (tplErr || !template) {
      return { success: false, error: tplErr?.message || "Template not found" };
    }

    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc("admin_assign_plan_to_student", {
      p_student_id: studentId,
      p_plan_template_id: planTemplateId,
      p_duration_months: durationMonths,
    });

    const rpcOk = !rpcError && rpcData?.success;

    if (!rpcOk) {
      // Fallback client-side
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
        has_nutrition_tracking: !!template.has_nutrition_tracking,
      });

      if (insErr) return { success: false, error: insErr.message };
    } else if (template.has_nutrition_tracking) {
      // RPC path: stamp the flag on the freshly-created active plan
      await supabase
        .from("plans")
        .update({ has_nutrition_tracking: true })
        .eq("student_id", studentId)
        .eq("is_active", true);
    }

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

// ============================================
// EVALUATIONS (Migration 019)
// ============================================

export const STRENGTH_EXERCISES = [
  { key: "sentadilla",          label: "Sentadilla" },
  { key: "peso_muerto",         label: "Peso muerto" },
  { key: "press_banca",         label: "Press banca" },
  { key: "press_militar",       label: "Press militar" },
  { key: "dominada",            label: "Dominada" },
  { key: "remo",                label: "Remo" },
  { key: "hip_thrust",          label: "Hip thrust" },
  { key: "peso_muerto_rumano",  label: "Peso muerto rumano" },
] as const;

export type StrengthExerciseKey = typeof STRENGTH_EXERCISES[number]["key"];

export interface BodyEvaluation {
  id: string;
  patient_id: string;
  professional_id?: string | null;
  measured_at: string;       // YYYY-MM-DD
  height_cm?: number | null;
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  muscle_mass_pct?: number | null;
  bone_mass_pct?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  chest_cm?: number | null;
  arm_cm?: number | null;
  thigh_cm?: number | null;
  calf_cm?: number | null;
  neck_cm?: number | null;
  shoulders_cm?: number | null;
  skinfolds?: Skinfolds | null;
  resting_heart_rate?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  max_hr_zones?: MaxHrZones | null;
  habits?: Habits | null;
  pain_assessment?: PainAssessment | null;
  rom_notes?: string | null;
  strength_notes?: string | null;
  findings?: string | null;
  objectives?: EvaluationObjectives | null;
  notes?: string | null;
  created_at: string;
}

export interface StrengthEvaluation {
  id: string;
  patient_id: string;
  professional_id?: string | null;
  measured_at: string;
  exercise: StrengthExerciseKey;
  weight_kg: number;
  reps: number;
  notes?: string | null;
  created_at: string;
}

export async function listBodyEvaluations(
  patientId: string
): Promise<{ success: boolean; data?: BodyEvaluation[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("body_evaluations")
      .select("*")
      .eq("patient_id", patientId)
      .order("measured_at", { ascending: false })
      .limit(24);
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as BodyEvaluation[]) || [] };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function createBodyEvaluation(
  payload: Omit<BodyEvaluation, "id" | "created_at"> & { professional_id?: string | null }
): Promise<{ success: boolean; data?: BodyEvaluation; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("body_evaluations")
      .insert(payload)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as BodyEvaluation };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function deleteBodyEvaluation(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("body_evaluations").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function listStrengthEvaluations(
  patientId: string
): Promise<{ success: boolean; data?: StrengthEvaluation[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("strength_evaluations")
      .select("*")
      .eq("patient_id", patientId)
      .order("measured_at", { ascending: false })
      .limit(200);
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data as StrengthEvaluation[]) || [] };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function createStrengthEvaluation(
  payload: Omit<StrengthEvaluation, "id" | "created_at"> & { professional_id?: string | null }
): Promise<{ success: boolean; data?: StrengthEvaluation; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("strength_evaluations")
      .insert(payload)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as StrengthEvaluation };
  } catch (e) { return { success: false, error: String(e) }; }
}

export async function deleteStrengthEvaluation(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("strength_evaluations").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: String(e) }; }
}

/**
 * For the teacher panel "nutritionist control pending" widget.
 * Among the given student ids, returns those whose active plan has
 * has_nutrition_tracking=true AND who have NO booking with a
 * nutritionist in the current calendar month.
 */
export async function findStudentsMissingNutritionBooking(
  studentIds: string[]
): Promise<{
  success: boolean;
  data?: Array<{ student_id: string; student_name?: string; student_phone?: string | null }>;
  error?: string;
}> {
  if (studentIds.length === 0) return { success: true, data: [] };
  try {
    // Sin FK embed — el constraint plans_student_id_fkey no existe.
    // Hacemos las queries en 2 pasos y mergeamos en cliente.
    const { data: plans, error: planErr } = await supabase
      .from("plans")
      .select("student_id")
      .eq("is_active", true)
      .eq("has_nutrition_tracking", true)
      .in("student_id", studentIds);
    if (planErr) return { success: false, error: planErr.message };
    const eligible = (plans as { student_id: string }[]) || [];
    if (eligible.length === 0) return { success: true, data: [] };

    const eligibleIds = Array.from(new Set(eligible.map((p) => p.student_id)));

    // Profiles para nombres+teléfonos
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", eligibleIds);
    const profileBy = new Map<string, { full_name?: string; phone?: string }>();
    for (const p of (profs as { id: string; full_name?: string; phone?: string }[]) || []) {
      profileBy.set(p.id, { full_name: p.full_name, phone: p.phone });
    }
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartIso = monthStart.toISOString().slice(0, 10);

    const { data: bookings, error: bookErr } = await supabase
      .from("bookings")
      .select("student_id")
      .in("student_id", eligibleIds)
      .eq("professional_type", "nutritionist")
      .in("status", ["confirmed", "completed"])
      .gte("booking_date", monthStartIso);
    if (bookErr) return { success: false, error: bookErr.message };

    const bookedSet = new Set(
      ((bookings as { student_id: string }[]) || []).map((b) => b.student_id),
    );

    // Dedupe por student_id (puede haber múltiples planes activos por error)
    const seen = new Set<string>();
    const result: Array<{ student_id: string; student_name?: string; student_phone?: string | null }> = [];
    for (const p of eligible) {
      if (seen.has(p.student_id) || bookedSet.has(p.student_id)) continue;
      seen.add(p.student_id);
      const prof = profileBy.get(p.student_id);
      result.push({
        student_id: p.student_id,
        student_name: prof?.full_name,
        student_phone: prof?.phone,
      });
    }
    return { success: true, data: result };
  } catch (e) { return { success: false, error: String(e) }; }
}

/**
 * For the teacher panel "missing monthly evaluation" widget.
 * Given a set of student ids, returns those whose most recent
 * body_evaluation is older than 30 days (or who have none).
 */
export async function findStudentsMissingMonthlyEval(
  studentIds: string[]
): Promise<{
  success: boolean;
  data?: Array<{ patient_id: string; last_eval?: string | null }>;
  error?: string;
}> {
  if (studentIds.length === 0) return { success: true, data: [] };
  try {
    const { data, error } = await supabase
      .from("body_evaluations")
      .select("patient_id, measured_at")
      .in("patient_id", studentIds)
      .order("measured_at", { ascending: false });
    if (error) return { success: false, error: error.message };

    // Most-recent per patient
    const latest = new Map<string, string>();
    for (const r of (data as { patient_id: string; measured_at: string }[]) || []) {
      if (!latest.has(r.patient_id)) latest.set(r.patient_id, r.measured_at);
    }

    const cutoffIso = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const missing: Array<{ patient_id: string; last_eval?: string | null }> = [];
    for (const id of studentIds) {
      const last = latest.get(id);
      if (!last || last < cutoffIso) missing.push({ patient_id: id, last_eval: last ?? null });
    }
    return { success: true, data: missing };
  } catch (e) { return { success: false, error: String(e) }; }
}

// ============================================
// STUDENT ↔ PROFESSIONALS (M2M) - Migration 023
// ============================================

export interface StudentProfessionalLink {
  student_id: string;
  professional_id: string;
  professional_type?: string | null;
  assigned_at: string;
  assigned_by?: string | null;
  notes?: string | null;
}

/**
 * Lista los profesionales asignados a un alumno (con datos del profesional
 * para mostrar nombre y tipo en UI). Para el alumno y el admin.
 */
export async function listProfessionalsForStudent(
  studentId: string,
): Promise<{
  success: boolean;
  data?: Array<{
    professional_id: string;
    full_name?: string;
    professional_type?: string | null;
    assigned_at: string;
  }>;
  error?: string;
}> {
  try {
    const { data: links, error } = await supabase
      .from("student_professionals")
      .select("professional_id, professional_type, assigned_at")
      .eq("student_id", studentId);
    if (error) return { success: false, error: error.message };
    const rows = (links as Array<{ professional_id: string; professional_type?: string; assigned_at: string }>) || [];
    if (rows.length === 0) return { success: true, data: [] };

    const ids = rows.map((r) => r.professional_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, professional_type")
      .in("id", ids);
    const profileBy = new Map<string, { full_name?: string; professional_type?: string }>();
    for (const p of (profs as { id: string; full_name?: string; professional_type?: string }[]) || []) {
      profileBy.set(p.id, p);
    }
    return {
      success: true,
      data: rows.map((r) => ({
        professional_id: r.professional_id,
        full_name: profileBy.get(r.professional_id)?.full_name,
        professional_type: r.professional_type || profileBy.get(r.professional_id)?.professional_type || null,
        assigned_at: r.assigned_at,
      })),
    };
  } catch (e) { return { success: false, error: String(e) }; }
}

/**
 * Lista los IDs de alumnos asignados a un profesional. Lo usa PatientsList
 * cuando el caller es teacher (no admin) para filtrar su vista.
 */
export async function listAssignedStudentIds(
  professionalId: string,
): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("student_professionals")
      .select("student_id")
      .eq("professional_id", professionalId);
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      data: ((data as { student_id: string }[]) || []).map((r) => r.student_id),
    };
  } catch (e) { return { success: false, error: String(e) }; }
}

/**
 * Admin: asigna un profesional a un alumno. RLS bloquea a no-admin.
 */
export async function assignProfessionalToStudent(
  studentId: string,
  professionalId: string,
  professionalType?: string | null,
  notes?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const callerId = sess?.session?.user?.id;
    const { error } = await supabase
      .from("student_professionals")
      .insert({
        student_id: studentId,
        professional_id: professionalId,
        professional_type: professionalType || null,
        assigned_by: callerId || null,
        notes: notes || null,
      });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: String(e) }; }
}

/**
 * Admin: quita la asignación. RLS bloquea a no-admin.
 */
export async function removeProfessionalFromStudent(
  studentId: string,
  professionalId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("student_professionals")
      .delete()
      .eq("student_id", studentId)
      .eq("professional_id", professionalId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e) { return { success: false, error: String(e) }; }
}

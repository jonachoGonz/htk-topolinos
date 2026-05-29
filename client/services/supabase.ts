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

export interface BookingRecord {
  id: string;
  user_id: string;
  slot_id: string;
  booked_at: string;
  cancelled_at?: string;
}

export interface Availability {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number;
  is_holiday: boolean;
  created_at: string;
}

export interface Plan {
  id: string;
  student_id: string;
  name: string;
  total_sessions: number;
  remaining_sessions: number;
  expiry_date: string;
  is_active: boolean;
  created_at: string;
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

    // Fetch user role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    if (profile.role !== "teacher") {
      return { success: false, error: "Acceso no autorizado." };
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

    // Fetch user role from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    if (profile.role !== "student") {
      return { success: false, error: "Acceso no autorizado." };
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
 * Create booking record
 */
export async function createBooking(
  userId: string,
  slotId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("bookings").insert({
      user_id: userId,
      slot_id: slotId,
      booked_at: new Date().toISOString(),
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
 * Cancel booking record
 */
export async function cancelBooking(
  userId: string,
  slotId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("bookings")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("slot_id", slotId)
      .is("cancelled_at", null);

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
    const { error } = await supabase.from("availability").insert({
      professional_id: professionalId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      max_capacity: maxCapacity,
      is_holiday: false,
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
  studentId: string,
  weekStart: Date
): Promise<{ success: boolean; data?: Availability[]; error?: string }> {
  try {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString())
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
 * Sign out the current user
 */
export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

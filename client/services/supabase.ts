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
  student_id: string;
  professional_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled" | "completed";
  notes?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
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
  updated_at: string;
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
  updated_at: string;
}

export interface ProgressRecord {
  id: string;
  patient_id: string;
  professional_id: string;
  record_date: string;
  notes: string;
  metrics?: Record<string, any>;
  created_at: string;
  updated_at: string;
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
 * Sign out the current user
 */
export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

// ============================================================================
// AVAILABILITY FUNCTIONS
// ============================================================================

export async function getAvailability(
  professionalId: string
): Promise<{ success: boolean; data?: Availability[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("professional_id", professionalId)
      .order("day_of_week")
      .order("start_time");

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Availability[] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function createAvailability(
  professionalId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  maxCapacity: number = 5
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("availability").insert({
      professional_id: professionalId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      max_capacity: maxCapacity,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deleteAvailability(
  availabilityId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("availability")
      .delete()
      .eq("id", availabilityId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// BOOKINGS FUNCTIONS
// ============================================================================

export async function getBookings(
  type: "student" | "professional",
  userId: string
): Promise<{ success: boolean; data?: BookingRecord[]; error?: string }> {
  try {
    const field = type === "student" ? "student_id" : "professional_id";
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq(field, userId)
      .order("booking_date", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as BookingRecord[] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function createNewBooking(
  studentId: string,
  professionalId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  notes?: string
): Promise<{ success: boolean; data?: BookingRecord; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        student_id: studentId,
        professional_id: professionalId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes || null,
        status: "confirmed",
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as BookingRecord };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function updateBookingStatus(
  bookingId: string,
  status: "confirmed" | "cancelled" | "completed"
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, any> = { status };
    if (status === "cancelled") {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// PLANS FUNCTIONS
// ============================================================================

export async function getPlan(
  studentId: string
): Promise<{ success: boolean; data?: Plan; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .single();

    if (error && error.code !== "PGRST116") {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Plan };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function createPlan(
  studentId: string,
  name: string,
  totalSessions: number,
  expiryDate: string
): Promise<{ success: boolean; data?: Plan; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("plans")
      .insert({
        student_id: studentId,
        name,
        total_sessions: totalSessions,
        remaining_sessions: totalSessions,
        expiry_date: expiryDate,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Plan };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// PROGRESS RECORDS FUNCTIONS
// ============================================================================

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

    return { success: true, data: data as ProgressRecord[] };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function createProgressRecord(
  patientId: string,
  professionalId: string,
  notes: string,
  metrics?: Record<string, any>
): Promise<{ success: boolean; data?: ProgressRecord; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("progress_records")
      .insert({
        patient_id: patientId,
        professional_id: professionalId,
        record_date: new Date().toISOString().split("T")[0],
        notes,
        metrics: metrics || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as ProgressRecord };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================================
// PROFILE FUNCTIONS
// ============================================================================

export async function updateProfile(
  userId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

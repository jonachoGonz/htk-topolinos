/**
 * Supabase Client Service - HTK Center
 *
 * To activate the real Supabase integration:
 * 1. Run: pnpm add @supabase/supabase-js
 * 2. Set env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * 3. Uncomment the real implementation below and remove the mock
 */

// --- Real Supabase (uncomment to activate) ---
// import { createClient } from '@supabase/supabase-js'
// export const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL,
//   import.meta.env.VITE_SUPABASE_ANON_KEY
// )

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

/**
 * Login teacher (professional) with email + password.
 * Real implementation checks `profiles.role` in Supabase.
 */
export async function loginTeacher(
  email: string,
  password: string
): Promise<LoginResult> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 800));

  if (!email || !password) {
    return { success: false, error: "Por favor completa todos los campos." };
  }

  // --- Real implementation ---
  // const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  // if (error) return { success: false, error: error.message }
  // const { data: profile } = await supabase
  //   .from('profiles').select('role').eq('id', data.user.id).single()
  // if (profile?.role !== 'teacher') return { success: false, error: 'Acceso no autorizado.' }
  // return { success: true, user: { id: data.user.id, email, role: 'teacher' } }

  // Mock: any credential works
  return {
    success: true,
    user: { id: "mock-teacher-1", email, role: "teacher" },
  };
}

/**
 * Login student with email/RUT + password.
 * Real implementation checks `profiles.role` in Supabase.
 */
export async function loginStudent(
  emailOrRut: string,
  password: string
): Promise<LoginResult> {
  await new Promise((r) => setTimeout(r, 800));

  if (!emailOrRut || !password) {
    return { success: false, error: "Por favor completa todos los campos." };
  }

  // --- Real implementation ---
  // const { data, error } = await supabase.auth.signInWithPassword({ email: emailOrRut, password })
  // if (error) return { success: false, error: error.message }
  // const { data: profile } = await supabase
  //   .from('profiles').select('role').eq('id', data.user.id).single()
  // if (profile?.role !== 'student') return { success: false, error: 'Acceso no autorizado.' }
  // return { success: true, user: { id: data.user.id, email: emailOrRut, role: 'student' } }

  return {
    success: true,
    user: { id: "mock-student-1", email: emailOrRut, role: "student" },
  };
}

/**
 * Sign out the current user.
 */
export async function logout(): Promise<void> {
  // await supabase.auth.signOut()
}

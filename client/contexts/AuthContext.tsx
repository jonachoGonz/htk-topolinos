import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/services/supabase";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: "teacher" | "student" | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"teacher" | "student" | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Happy path: claims from JWT app_metadata (migration 017).
        // No DB query → cannot recurse, cannot fail on stale RLS cache.
        const meta = (newSession.user.app_metadata ?? {}) as {
          role?: "teacher" | "student";
          is_admin?: boolean;
        };

        if (meta.role) {
          setUserRole(meta.role);
          setIsAdmin(!!meta.is_admin);
          setLoading(false);
        } else {
          // Legacy fallback for sessions issued before the claims existed.
          // Deferred to avoid Supabase auth lock deadlock.
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("role, is_admin")
              .eq("id", newSession.user.id)
              .maybeSingle();
            setUserRole(profile ? (profile.role as "teacher" | "student") : null);
            setIsAdmin(!!profile?.is_admin);
            setLoading(false);
          }, 0);
        }
      } else {
        setUserRole(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        return { success: true };
      }

      return { success: false, error: "Unknown error occurred" };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setUserRole(null);
      setIsAdmin(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

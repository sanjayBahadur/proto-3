"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ensureUserProfileClient } from "@/lib/supabase/profiles";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/supabase/roles";

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (
    email: string,
    password: string,
    role: "manager" | "staff",
    orgName?: string,
    orgId?: string
  ) => Promise<{ error: string | null; checkEmail?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session and ensure profile exists
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setUser(user);

        if (user) {
          // Ensure profile exists and get role
          const profile = await ensureUserProfileClient(user.id, user.email || undefined);

          // Check if user is disabled
          if (profile?.disabled) {
            await supabase.auth.signOut();
            setUser(null);
            setRole(null);
            return;
          }

          setRole(profile?.role ?? null);
        }
      } catch (err) {
        console.error("Error getting user:", err);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Ensure profile exists on auth state change (e.g., after login)
        const profile = await ensureUserProfileClient(
          currentUser.id,
          currentUser.email || undefined
        );

        // Check if user is disabled
        if (profile?.disabled) {
          await supabase.auth.signOut();
          setUser(null);
          setRole(null);
          return;
        }

        setRole(profile?.role ?? null);
      } else {
        setRole(null);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const login = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    // Get profile to determine redirect
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const profile = await ensureUserProfileClient(user.id, user.email || undefined);

      // Check if disabled
      if (profile?.disabled) {
        await supabase.auth.signOut();
        return { error: "Account has been disabled. Contact an administrator." };
      }

      // Redirect based on role
      switch (profile?.role) {
        case "admin":
          router.push("/admin");
          break;
        case "staff":
          router.push("/staff");
          break;
        default:
          router.push("/dashboard");
      }
    } else {
      router.push("/dashboard");
    }

    router.refresh();
    return { error: null };
  };

  const signup = async (
    email: string,
    password: string,
    role: "manager" | "staff",
    orgName?: string,
    orgId?: string
  ): Promise<{ error: string | null; checkEmail?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
        data: {
          role,
          org_name: orgName,
          org_id: orgId,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    // If a session is created, the user is logged in automatically (email confirmation disabled)
    // If no session, email confirmation is required
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return { error: null };
    }

    // User created but not logged in -> requires email check
    if (data.user) {
      return { error: null, checkEmail: true };
    }

    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setRole(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

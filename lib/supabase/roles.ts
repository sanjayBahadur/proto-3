import { createClient } from "./server";

export type UserRole = "manager" | "staff";

export interface UserProfile {
  id: string;
  role: UserRole;
  created_at: string;
}

/**
 * Get the current user's role from the profiles table.
 * For use in Server Components only.
 * Returns null if user is not authenticated or profile doesn't exist.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (profile?.role as UserRole) ?? null;
}

/**
 * Get the current user's full profile.
 * For use in Server Components only.
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as UserProfile | null;
}

/**
 * Ensure a profile exists for the given user.
 * Creates one with default role "manager" if missing.
 * For use in Server Components only.
 */
export async function ensureUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const supabase = await createClient();

  // Try to get existing profile
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (existingProfile) {
    return existingProfile as UserProfile;
  }

  // Create new profile with default role
  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      role: "manager" as UserRole,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating profile:", error);
    return null;
  }

  return newProfile as UserProfile;
}


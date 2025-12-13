import { createClient } from "./client";
import type { UserRole } from "./roles";

export interface UserProfile {
  id: string;
  role: UserRole;
  created_at: string;
}

/**
 * Ensure a profile exists for the current user (client-side).
 * Creates one with default role "manager" if missing.
 */
export async function ensureUserProfileClient(
  userId: string
): Promise<UserProfile | null> {
  const supabase = createClient();

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

/**
 * Get the current user's profile (client-side).
 */
export async function getUserProfileClient(
  userId: string
): Promise<UserProfile | null> {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return profile as UserProfile | null;
}


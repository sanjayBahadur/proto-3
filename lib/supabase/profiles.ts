import { createClient } from "./client";
import type { UserRole } from "./roles";

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string | null;
  org_id: string | null;
  disabled: boolean;
  created_at: string;
}

/**
 * Ensure a profile exists for the current user (client-side).
 * Creates one with default role "manager" if missing.
 */
export async function ensureUserProfileClient(
  userId: string,
  email?: string
): Promise<UserProfile | null> {
  const supabase = createClient();

  // Try to get existing profile
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (existingProfile) {
    // Update email if provided and different
    if (email && existingProfile.email !== email) {
      await supabase
        .from("profiles")
        .update({ email })
        .eq("id", userId);
    }
    return existingProfile as UserProfile;
  }

  // Get default org ID for new users
  const { data: defaultOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("name", "Default Organization")
    .single();

  // Create new profile with default role "manager"
  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      role: "manager" as UserRole,
      email: email || null,
      org_id: defaultOrg?.id || null,
      disabled: false,
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

  if (!profile || profile.disabled) {
    return null;
  }

  return profile as UserProfile;
}

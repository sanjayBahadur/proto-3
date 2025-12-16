import { createClient } from "./server";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "manager" | "staff";

export interface UserProfile {
  id: string;
  role: UserRole;
  email: string | null;
  org_id: string | null;
  disabled: boolean;
  created_at: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  profile: UserProfile;
}

/**
 * Get the current authenticated user with their profile.
 * For use in Server Components and Server Actions.
 * Returns null if user is not authenticated or profile doesn't exist.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, email, org_id, disabled, created_at")
    .eq("id", user.id)
    .single();

  if (!profile || profile.disabled) {
    return null;
  }

  return {
    id: user.id,
    email: user.email || "",
    profile: profile as UserProfile,
  };
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
    .select("role, disabled")
    .eq("id", user.id)
    .single();

  if (!profile || profile.disabled) {
    return null;
  }

  return profile.role as UserRole;
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

  if (!profile || profile.disabled) {
    return null;
  }

  return profile as UserProfile;
}

/**
 * Ensure a profile exists for the given user.
 * Creates one with default role "manager" if missing.
 * For use in Server Components only.
 */
export async function ensureUserProfile(
  userId: string,
  email?: string
): Promise<UserProfile | null> {
  const supabase = await createClient();

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

// =============================================================================
// RBAC ENFORCEMENT FUNCTIONS
// =============================================================================

/**
 * Require a specific role or set of roles.
 * Throws/redirects if user doesn't have required role.
 * For use in Server Actions and Route Handlers.
 * 
 * @param allowedRoles - Single role or array of roles that are allowed
 * @param redirectTo - Optional URL to redirect to on failure (default: throws error)
 * @returns The current user if authorized
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[],
  redirectTo?: string
): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    if (redirectTo) {
      redirect(redirectTo);
    }
    throw new Error("Unauthorized: Not authenticated");
  }

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  if (!roles.includes(user.profile.role)) {
    if (redirectTo) {
      redirect(redirectTo);
    }
    throw new Error(`Unauthorized: Requires ${roles.join(" or ")} role`);
  }

  return user;
}

/**
 * Require admin role.
 * Throws/redirects if user is not an admin.
 * 
 * @param redirectTo - Optional URL to redirect to on failure
 * @returns The current user if authorized
 */
export async function requireAdmin(redirectTo?: string): Promise<CurrentUser> {
  return requireRole("admin", redirectTo);
}

/**
 * Require manager or admin role.
 * Throws/redirects if user is not a manager or admin.
 * 
 * @param redirectTo - Optional URL to redirect to on failure
 * @returns The current user if authorized
 */
export async function requireManagerOrAdmin(
  redirectTo?: string
): Promise<CurrentUser> {
  return requireRole(["admin", "manager"], redirectTo);
}

/**
 * Require staff, manager, or admin role (any authenticated user).
 * Throws/redirects if user is not authenticated.
 * 
 * @param redirectTo - Optional URL to redirect to on failure
 * @returns The current user if authorized
 */
export async function requireAuthenticated(
  redirectTo?: string
): Promise<CurrentUser> {
  return requireRole(["admin", "manager", "staff"], redirectTo);
}

/**
 * Check if current user can access a specific organization.
 * Returns true if user is admin (can access all orgs) or belongs to the org.
 */
export async function canAccessOrg(orgId: string): Promise<boolean> {
  const user = await getCurrentUser();
  
  if (!user) {
    return false;
  }

  // Admins can access all orgs
  if (user.profile.role === "admin") {
    return true;
  }

  // Other users can only access their own org
  return user.profile.org_id === orgId;
}

/**
 * Get users's redirect path based on their role.
 */
export function getRoleHomePath(role: UserRole | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "manager":
      return "/dashboard";
    case "staff":
      return "/staff";
    default:
      return "/login";
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin, type UserRole } from "@/lib/supabase/roles";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

// =============================================================================
// TYPES
// =============================================================================

export interface AdminUser {
  id: string;
  email: string | null;
  role: UserRole;
  org_id: string | null;
  disabled: boolean;
  created_at: string;
  organization?: {
    id: string;
    name: string;
  } | null;
}

export interface UpdateUserInput {
  role?: UserRole;
  disabled?: boolean;
  org_id?: string | null;
}

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * List all users (admin only)
 */
export async function listAllUsers(): Promise<{
  data: AdminUser[];
  error: string | null;
}> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        email,
        role,
        org_id,
        disabled,
        created_at,
        organization:organizations(id, name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      logger.apiError("listAllUsers", error, { adminId: admin.id });
      return { data: [], error: error.message };
    }

    return { data: data as AdminUser[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { data: [], error: message };
  }
}

/**
 * Update a user's role (admin only)
 * Cannot change another admin's role or your own role
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error: string | null }> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    // Cannot change your own role
    if (userId === admin.id) {
      return { success: false, error: "Cannot change your own role" };
    }

    // Get target user's current role
    const { data: targetUser, error: fetchError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (fetchError || !targetUser) {
      return { success: false, error: "User not found" };
    }

    // Cannot demote another admin
    if (targetUser.role === "admin" && newRole !== "admin") {
      return { success: false, error: "Cannot demote another admin" };
    }

    // Perform update
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      logger.apiError("updateUserRole", error, { adminId: admin.id, userId, newRole });
      return { success: false, error: error.message };
    }

    logger.info("User role updated by admin", {
      adminId: admin.id,
      userId,
      newRole,
      previousRole: targetUser.role,
    });

    revalidatePath("/admin/users");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { success: false, error: message };
  }
}

/**
 * Disable or enable a user account (admin only)
 * Cannot disable your own account or another admin
 */
export async function toggleUserDisabled(
  userId: string,
  disabled: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    // Cannot disable your own account
    if (userId === admin.id) {
      return { success: false, error: "Cannot disable your own account" };
    }

    // Get target user's role
    const { data: targetUser, error: fetchError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (fetchError || !targetUser) {
      return { success: false, error: "User not found" };
    }

    // Cannot disable another admin
    if (targetUser.role === "admin") {
      return { success: false, error: "Cannot disable an admin account" };
    }

    // Perform update
    const { error } = await supabase
      .from("profiles")
      .update({ disabled })
      .eq("id", userId);

    if (error) {
      logger.apiError("toggleUserDisabled", error, { adminId: admin.id, userId, disabled });
      return { success: false, error: error.message };
    }

    logger.info("User account status changed by admin", {
      adminId: admin.id,
      userId,
      disabled,
    });

    revalidatePath("/admin/users");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { success: false, error: message };
  }
}

/**
 * Update a user's organization (admin only)
 */
export async function updateUserOrg(
  userId: string,
  orgId: string | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    // Verify org exists if provided
    if (orgId) {
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id")
        .eq("id", orgId)
        .single();

      if (orgError || !org) {
        return { success: false, error: "Organization not found" };
      }
    }

    // Perform update
    const { error } = await supabase
      .from("profiles")
      .update({ org_id: orgId })
      .eq("id", userId);

    if (error) {
      logger.apiError("updateUserOrg", error, { adminId: admin.id, userId, orgId });
      return { success: false, error: error.message };
    }

    logger.info("User organization updated by admin", {
      adminId: admin.id,
      userId,
      orgId,
    });

    revalidatePath("/admin/users");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { success: false, error: message };
  }
}

// =============================================================================
// ORGANIZATION MANAGEMENT
// =============================================================================

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

/**
 * List all organizations (admin only)
 */
export async function listOrganizations(): Promise<{
  data: Organization[];
  error: string | null;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data as Organization[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { data: [], error: message };
  }
}

/**
 * Create a new organization (admin only)
 */
export async function createOrganization(
  name: string
): Promise<{ data: Organization | null; error: string | null }> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organizations")
      .insert({ name })
      .select()
      .single();

    if (error) {
      logger.apiError("createOrganization", error, { adminId: admin.id, name });
      return { data: null, error: error.message };
    }

    logger.info("Organization created by admin", {
      adminId: admin.id,
      orgId: data.id,
      name,
    });

    revalidatePath("/admin/users");
    return { data: data as Organization, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { data: null, error: message };
  }
}

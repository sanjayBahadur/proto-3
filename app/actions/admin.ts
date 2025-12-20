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
  org_ids?: string[]; // For Staff multi-org
  disabled: boolean;
  created_at: string;
  organization?: {
    id: string;
    name: string;
  } | null;
  organization_members?: {
    org_id: string;
    organization: {
      id: string;
      name: string;
    };
  }[];
}

export interface UpdateUserInput {
  role?: UserRole;
  disabled?: boolean;
  org_id?: string | null;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  query?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  role?: UserRole;
  orgId?: string;
}

// =============================================================================
// HELPER
// =============================================================================

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_KEY;
}

// =============================================================================
// USER MANAGEMENT
// =============================================================================

/**
 * List users with pagination, search, sorting, and filtering (admin only)
 */
export async function listAllUsers(params: ListUsersParams = {}): Promise<{
  data: AdminUser[];
  count: number;
  error: string | null;
}> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    const page = params.page || 1;
    const limit = params.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Construct select string
    // If filtering by Org, use !inner on members to enforce relationship existence
    // Note: This might filter the returned members array to only the matching one, 
    // but for list view this is generally acceptable or unavoidable in single query
    const memberJoinType = params.orgId ? '!inner' : '';
    const selectString = `
        id,
        email,
        role,
        org_id,
        disabled,
        created_at,
        organization:organizations(id, name),
        organization_members${memberJoinType}!user_id(
            org_id,
            organization:organizations(id, name)
        )
    `;

    let query = supabase
      .from("profiles")
      .select(selectString, { count: 'exact' });

    // Filter: Role
    if (params.role) {
      query = query.eq('role', params.role);
    }

    // Filter: Organization
    if (params.orgId) {
      query = query.eq('organization_members.org_id', params.orgId);
    }

    // Search
    if (params.query) {
      query = query.ilike('email', `%${params.query}%`);
    }

    // Sort
    const order = params.order || 'desc';
    switch (params.sort) {
      case 'email':
        query = query.order('email', { ascending: order === 'asc' });
        break;
      case 'role':
        query = query.order('role', { ascending: order === 'asc' });
        break;
      case 'status':
        query = query.order('disabled', { ascending: order === 'asc' });
        break;
      case 'joined':
        query = query.order('created_at', { ascending: order === 'asc' });
        break;
      case 'organization':
        // Sort by related organization name
        query = query.order('name', { foreignTable: 'organization', ascending: order === 'asc' });
        break;
      default:
        query = query.order('created_at', { ascending: false }); // Default sort
    }

    // Pagination
    query = query.range(from, to);

    const { data: profiles, error, count } = await query;

    if (error) {
      logger.apiError("listAllUsers", error, { adminId: admin.id });
      return { data: [], count: 0, error: error.message };
    }

    // Transform data
    // If we filtered by orgId, organization_members might only contain that org.
    // If we want FULL org list, we might need a separate fetch or accepting the partial view.
    // For now, partial view is acceptable for Admin table context (if you filter by X, seeing affiliation with X is primary).
    const transformedData = (profiles ?? []).map(profile => {
      // Type coercion to resolve build error: Spread types may only be created from object types.
      const profileObj = profile as unknown as Record<string, unknown>;
      return {
        ...profileObj,
        org_ids: (profileObj.organization_members as any[] | undefined)?.map((m: any) => m.org_id) || []
      };
    });

    return { data: transformedData as unknown as AdminUser[], count: count || 0, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { data: [], count: 0, error: message };
  }
}

/**
 * Update a user's role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error: string | null }> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    if (userId === admin.id) return { success: false, error: "Cannot change your own role" };

    const { data: targetUser, error: fetchError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (fetchError || !targetUser) return { success: false, error: "User not found" };

    if (targetUser.role === "admin" && newRole !== "admin") {
      return { success: false, error: "Cannot demote another admin" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      logger.apiError("updateUserRole", error, { adminId: admin.id, userId, newRole });
      return { success: false, error: error.message };
    }

    logger.info("User role updated by admin", { adminId: admin.id, userId, newRole, previousRole: targetUser.role });
    revalidatePath("/admin/users");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { success: false, error: message };
  }
}

/**
 * Disable or enable a user account (admin only)
 */
export async function toggleUserDisabled(
  userId: string,
  disabled: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    if (userId === admin.id) return { success: false, error: "Cannot disable your own account" };

    const { data: targetUser, error: fetchError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (fetchError || !targetUser) return { success: false, error: "User not found" };

    if (targetUser.role === "admin") return { success: false, error: "Cannot disable an admin account" };

    const { error } = await supabase
      .from("profiles")
      .update({ disabled })
      .eq("id", userId);

    if (error) {
      logger.apiError("toggleUserDisabled", error, { adminId: admin.id, userId, disabled });
      return { success: false, error: error.message };
    }

    logger.info("User account status changed by admin", { adminId: admin.id, userId, disabled });
    revalidatePath("/admin/users");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { success: false, error: message };
  }
}

/**
 * Update a user's organizations (admin only)
 */
export async function updateUserOrgs(
  userId: string,
  orgIds: string[],
  role: UserRole
): Promise<{ success: boolean; error: string | null }> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    if (role === 'manager') {
      if (orgIds.length > 1) return { success: false, error: "Managers can only belong to one organization." };
      const orgId = orgIds[0] || null;

      const { error } = await supabase.from("profiles").update({ org_id: orgId }).eq("id", userId);
      if (error) {
        logger.apiError("updateUserOrgs(Manager)", error, { adminId: admin.id, userId });
        return { success: false, error: error.message };
      }

      if (orgId) {
        await supabase.from("organization_members").delete().eq("user_id", userId).neq("org_id", orgId);
      } else {
        await supabase.from("organization_members").delete().eq("user_id", userId);
      }

    } else if (role === 'staff') {
      const { error: deleteError } = await supabase.from("organization_members").delete().eq("user_id", userId);
      if (deleteError) {
        logger.apiError("updateUserOrgs(Staff-Delete)", deleteError, { adminId: admin.id, userId });
        return { success: false, error: deleteError.message };
      }

      if (orgIds.length > 0) {
        const { error: insertError } = await supabase
          .from("organization_members")
          .insert(orgIds.map(orgId => ({ user_id: userId, org_id: orgId })));
        if (insertError) {
          logger.apiError("updateUserOrgs(Staff-Insert)", insertError, { adminId: admin.id, userId });
          return { success: false, error: insertError.message };
        }
      }
      await supabase.from("profiles").update({ org_id: null }).eq("id", userId);
    }

    logger.info("User organizations updated by admin", { adminId: admin.id, userId, orgIds, role });
    revalidatePath("/admin/users");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { success: false, error: message };
  }
}

/**
 * Legacy wrapper
 */
export async function updateUserOrg(userId: string, orgId: string | null) {
  return updateUserOrgs(userId, orgId ? [orgId] : [], 'manager');
}

/**
 * Update user password (admin only)
 */
export async function updateUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const admin = await requireAdmin();
    const serviceRoleKey = getServiceRoleKey();
    if (!serviceRoleKey) return { success: false, error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY (or SERVICE_KEY) is missing." };

    const { createClient: createServiceClient } = require('@supabase/supabase-js');
    const serviceClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

    const { error } = await serviceClient.auth.admin.updateUserById(userId, { password: newPassword });

    if (error) {
      logger.apiError("updateUserPassword", error, { adminId: admin.id, userId });
      return { success: false, error: error.message };
    }

    logger.info("User password updated by admin", { adminId: admin.id, userId });
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { success: false, error: message };
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const admin = await requireAdmin();
    if (userId === admin.id) return { success: false, error: "Cannot delete your own account" };

    const serviceRoleKey = getServiceRoleKey();
    if (!serviceRoleKey) return { success: false, error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY (or SERVICE_KEY) is missing." };

    const { createClient: createServiceClient } = require('@supabase/supabase-js');
    const serviceClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

    // Safe Delete Check: Ensure user has no active properties
    const supabase = await createClient(); // Authenticated client (admin)
    const { count: propertyCount, error: propError } = await supabase
      .from("properties")
      .select("id", { count: 'exact', head: true })
      .eq("owner_id", userId)
      .is("deleted_at", null);

    if (propError) {
      logger.apiError("deleteUser", propError, { adminId: admin.id, userId });
      return { success: false, error: "Failed to verify user dependencies" };
    }

    if (propertyCount && propertyCount > 0) {
      return {
        success: false,
        error: `Cannot delete user: They own ${propertyCount} active propert${propertyCount === 1 ? 'y' : 'ies'}. Please delete or reassign them first.`
      };
    }

    const { error } = await serviceClient.auth.admin.deleteUser(userId);

    if (error) {
      logger.apiError("deleteUser", error, { adminId: admin.id, userId });
      return { success: false, error: error.message };
    }

    logger.info("User deleted by admin", { adminId: admin.id, userId });
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
  deleted_at?: string | null;
}

// ...

export interface ListOrganizationsParams {
  page?: number;
  limit?: number;
  query?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export async function listOrganizations(params: ListOrganizationsParams = {}): Promise<{
  data: Organization[];
  count: number;
  error: string | null;
}> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    const page = params.page || 1;
    const limit = params.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("organizations")
      .select("*", { count: 'exact' })
      .is("deleted_at", null);

    // Search
    if (params.query) {
      query = query.ilike('name', `%${params.query}%`);
    }

    // Sort
    const order = params.order || 'asc';
    switch (params.sort) {
      case 'created_at':
        query = query.order('created_at', { ascending: order === 'asc' });
        break;
      case 'name':
      default:
        query = query.order('name', { ascending: order === 'asc' });
    }

    // Pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      logger.apiError("listOrganizations", error, { adminId: admin.id });
      return { data: [], count: 0, error: error.message };
    }

    return { data: data as Organization[], count: count || 0, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { data: [], count: 0, error: message };
  }
}

export async function createOrganization(name: string): Promise<{ data: Organization | null; error: string | null }> {
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

    logger.info("Organization created by admin", { adminId: admin.id, orgId: data.id, name });
    revalidatePath("/admin/organizations");
    return { data: data as Organization, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { data: null, error: message };
  }
}

/**
 * Update organization name
 */
export async function updateOrganization(
  orgId: string,
  name: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from("organizations")
      .update({ name })
      .eq("id", orgId);

    if (error) {
      logger.apiError("updateOrganization", error, { adminId: admin.id, orgId, name });
      return { success: false, error: error.message };
    }

    logger.info("Organization updated by admin", { adminId: admin.id, orgId, name });
    revalidatePath("/admin/organizations");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { success: false, error: message };
  }
}

/**
 * Delete an organization (admin only)
 */
export async function deleteOrganization(
  orgId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const admin = await requireAdmin();
    const supabase = await createClient();

    // Cascading delete is handled by database for members.
    // For properties, if they assume strict ownership, they might error or cascade depending on DB constraints.
    // We assume migration handled relationships appropriately. 

    const { error } = await supabase
      .from("organizations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", orgId);

    if (error) {
      logger.apiError("deleteOrganization", error, { adminId: admin.id, orgId });
      return { success: false, error: error.message };
    }

    logger.info("Organization deleted by admin", { adminId: admin.id, orgId });
    revalidatePath("/admin/organizations");
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return { success: false, error: message };
  }
}

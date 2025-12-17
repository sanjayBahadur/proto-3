"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { getCurrentUser, requireManagerOrAdmin } from "@/lib/supabase/roles";

export interface Property {
  id: string;
  owner_id: string;
  org_id: string | null;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  ical_url: string | null;
  health_score: number;
  last_sync_at: string | null;
  last_sync_status: "success" | "error" | "pending" | null;
  created_at: string;
  deleted_at?: string | null;
}

export interface CreatePropertyInput {
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

export interface UpdatePropertyInput {
  name?: string;
  address?: string | null;
  lat?: number;
  lng?: number;
  ical_url?: string | null;
}

/**
 * Validate iCal URL format
 */
function isValidIcalUrl(url: string): boolean {
  if (!url) return true; // Empty is valid (nullable)

  try {
    const parsed = new URL(url);
    // Must be http or https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    // Must end with .ics
    if (!parsed.pathname.toLowerCase().endsWith(".ics")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a new property for the current user
 * Only managers and admins can create properties
 */
export async function createProperty(
  input: CreatePropertyInput
): Promise<{ data: Property | null; error: string | null }> {
  try {
    const currentUser = await requireManagerOrAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("properties")
      .insert({
        owner_id: currentUser.id,
        org_id: currentUser.profile.org_id, // Assign to user's org
        name: input.name,
        address: input.address || null,
        lat: input.lat,
        lng: input.lng,
      })
      .select()
      .single();

    if (error) {
      logger.apiError("createProperty", error, { userId: currentUser.id, input });
      return { data: null, error: error.message };
    }

    logger.info("Property created", { userId: currentUser.id, propertyId: data.id });
    revalidatePath("/dashboard");
    return { data: data as Property, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    logger.unauthorized("createProperty", { input });
    return { data: null, error: message };
  }
}

// ...
/**
 * List properties for the current user
 * - Admin: can see all properties (use listAllProperties for full access)
 * - Manager: sees all properties in their organization
 * - Staff: sees all properties in their organization
 */
export async function listProperties(orgId?: string): Promise<{
  data: Property[];
  error: string | null;
}> {
  const currentUser = await getCurrentUser();
  const supabase = await createClient();

  if (!currentUser) {
    logger.unauthorized("listProperties");
    return { data: [], error: "Unauthorized" };
  }

  let query = supabase
    .from("properties")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Role-based filtering
  if (currentUser.profile.role === "admin") {
    // Admin can filter by specific org if provided, otherwise sees all
    if (orgId) {
      query = query.eq("org_id", orgId);
    }
  } else if (currentUser.profile.role === "manager" || currentUser.profile.role === "staff") {
    // Managers and Staff see properties for their assigned organization
    // Note: This relies on the user having a primary org_id in their profile
    // TODO: For multi-org staff, we might need to check organization_members
    if (currentUser.profile.org_id) {
      query = query.eq("org_id", currentUser.profile.org_id);
    } else {
      // If no org assigned, they see nothing (or maybe own properties if legacy?)
      // For now, strict org-based view:
      return { data: [], error: null };
    }
  }

  const { data, error } = await query;

  if (error) {
    logger.apiError("listProperties", error, { userId: currentUser.id });
    return { data: [], error: error.message };
  }

  return { data: data as Property[], error: null };
}

/**
 * List properties by organization
 * Useful for staff map view
 */
export async function listOrgProperties(): Promise<{
  data: Property[];
  error: string | null;
}> {
  const currentUser = await getCurrentUser();
  const supabase = await createClient();

  if (!currentUser) {
    logger.unauthorized("listOrgProperties");
    return { data: [], error: "Unauthorized" };
  }

  // RLS handles org filtering for staff
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    logger.apiError("listOrgProperties", error, { userId: currentUser.id });
    return { data: [], error: error.message };
  }

  return { data: data as Property[], error: null };
}

/**
 * Get a property by ID (must belong to current user)
 */
export async function getProperty(
  id: string
): Promise<{ data: Property | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("getProperty", { propertyId: id });
    return { data: null, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .eq("owner_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      logger.warn("Property not found or access denied", { userId: user.id, propertyId: id });
      return { data: null, error: "Property not found" };
    }
    logger.apiError("getProperty", error, { userId: user.id, propertyId: id });
    return { data: null, error: error.message };
  }

  return { data: data as Property, error: null };
}

/**
 * Update a property (must belong to current user)
 */
export async function updateProperty(
  id: string,
  input: UpdatePropertyInput
): Promise<{ data: Property | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("updateProperty", { propertyId: id });
    return { data: null, error: "Unauthorized" };
  }

  // Validate iCal URL if provided
  if (input.ical_url !== undefined && input.ical_url !== null && input.ical_url !== "") {
    if (!isValidIcalUrl(input.ical_url)) {
      return { data: null, error: "Invalid iCal URL. Must be a valid URL ending with .ics" };
    }
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.lat !== undefined) updateData.lat = input.lat;
  if (input.lng !== undefined) updateData.lng = input.lng;
  if (input.ical_url !== undefined) updateData.ical_url = input.ical_url || null;

  if (Object.keys(updateData).length === 0) {
    return { data: null, error: "No fields to update" };
  }

  const { data, error } = await supabase
    .from("properties")
    .update(updateData)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      logger.warn("Property update failed - not found or access denied", { userId: user.id, propertyId: id });
      return { data: null, error: "Property not found" };
    }
    logger.apiError("updateProperty", error, { userId: user.id, propertyId: id, input });
    return { data: null, error: error.message };
  }

  logger.info("Property updated", { userId: user.id, propertyId: id, fields: Object.keys(updateData) });
  revalidatePath("/dashboard");
  revalidatePath(`/properties/${id}`);
  return { data: data as Property, error: null };
}

/**
 * Update property iCal URL
 */
export async function updatePropertyIcalUrl(
  id: string,
  icalUrl: string | null
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("updatePropertyIcalUrl", { propertyId: id });
    return { success: false, error: "Unauthorized" };
  }

  // Validate iCal URL if provided
  if (icalUrl && !isValidIcalUrl(icalUrl)) {
    return { success: false, error: "Invalid iCal URL. Must be a valid URL ending with .ics" };
  }

  const { error } = await supabase
    .from("properties")
    .update({ ical_url: icalUrl || null })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    logger.apiError("updatePropertyIcalUrl", error, { userId: user.id, propertyId: id });
    return { success: false, error: error.message };
  }

  logger.info("Property iCal URL updated", { userId: user.id, propertyId: id, hasUrl: !!icalUrl });
  revalidatePath(`/properties/${id}`);
  return { success: true, error: null };
}

/**
 * Delete a property (must belong to current user)
 */
export async function deleteProperty(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("deleteProperty", { propertyId: id });
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("properties")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    logger.apiError("deleteProperty", error, { userId: user.id, propertyId: id });
    return { success: false, error: error.message };
  }

  logger.info("Property deleted", { userId: user.id, propertyId: id });
  revalidatePath("/dashboard");
  return { success: true, error: null };
}

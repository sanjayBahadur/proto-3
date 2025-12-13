"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  ical_url: string | null;
  created_at: string;
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
 */
export async function createProperty(
  input: CreatePropertyInput
): Promise<{ data: Property | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("createProperty", { input });
    return { data: null, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({
      owner_id: user.id,
      name: input.name,
      address: input.address || null,
      lat: input.lat,
      lng: input.lng,
    })
    .select()
    .single();

  if (error) {
    logger.apiError("createProperty", error, { userId: user.id, input });
    return { data: null, error: error.message };
  }

  logger.info("Property created", { userId: user.id, propertyId: data.id });
  revalidatePath("/dashboard");
  return { data: data as Property, error: null };
}

/**
 * List all properties for the current user
 */
export async function listProperties(): Promise<{
  data: Property[];
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("listProperties");
    return { data: [], error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logger.apiError("listProperties", error, { userId: user.id });
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
    .delete()
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

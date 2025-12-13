"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export interface Booking {
  id: string;
  property_id: string;
  source: string;
  external_uid: string;
  start_date: string;
  end_date: string;
  summary: string | null;
  raw: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingInput {
  property_id: string;
  source?: string;
  external_uid: string;
  start_date: string;
  end_date: string;
  summary?: string;
  raw?: Record<string, unknown>;
}

export interface UpdateBookingInput {
  start_date?: string;
  end_date?: string;
  summary?: string | null;
  raw?: Record<string, unknown> | null;
}

export interface UpsertBookingInput {
  property_id: string;
  source?: string;
  external_uid: string;
  start_date: string;
  end_date: string;
  summary?: string;
  raw?: Record<string, unknown>;
}

/**
 * Create a new booking
 */
export async function createBooking(
  input: CreateBookingInput
): Promise<{ data: Booking | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("createBooking", { propertyId: input.property_id });
    return { data: null, error: "Unauthorized" };
  }

  // Verify property ownership (RLS will also enforce this)
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", input.property_id)
    .eq("owner_id", user.id)
    .single();

  if (!property) {
    logger.warn("Booking creation failed - property not found or access denied", {
      userId: user.id,
      propertyId: input.property_id,
    });
    return { data: null, error: "Property not found" };
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      property_id: input.property_id,
      source: input.source || "ical",
      external_uid: input.external_uid,
      start_date: input.start_date,
      end_date: input.end_date,
      summary: input.summary || null,
      raw: input.raw || null,
    })
    .select()
    .single();

  if (error) {
    logger.apiError("createBooking", error, { userId: user.id, propertyId: input.property_id });
    return { data: null, error: error.message };
  }

  logger.info("Booking created", { userId: user.id, bookingId: data.id, propertyId: input.property_id });
  revalidatePath(`/properties/${input.property_id}`);
  return { data: data as Booking, error: null };
}

/**
 * Upsert a booking (insert or update based on property_id + external_uid)
 */
export async function upsertBooking(
  input: UpsertBookingInput
): Promise<{ data: Booking | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("upsertBooking", { propertyId: input.property_id });
    return { data: null, error: "Unauthorized" };
  }

  // Verify property ownership
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", input.property_id)
    .eq("owner_id", user.id)
    .single();

  if (!property) {
    logger.warn("Booking upsert failed - property not found or access denied", {
      userId: user.id,
      propertyId: input.property_id,
    });
    return { data: null, error: "Property not found" };
  }

  const { data, error } = await supabase
    .from("bookings")
    .upsert(
      {
        property_id: input.property_id,
        source: input.source || "ical",
        external_uid: input.external_uid,
        start_date: input.start_date,
        end_date: input.end_date,
        summary: input.summary || null,
        raw: input.raw || null,
      },
      {
        onConflict: "property_id,external_uid",
      }
    )
    .select()
    .single();

  if (error) {
    logger.apiError("upsertBooking", error, { userId: user.id, propertyId: input.property_id });
    return { data: null, error: error.message };
  }

  logger.info("Booking upserted", { userId: user.id, bookingId: data.id, propertyId: input.property_id });
  revalidatePath(`/properties/${input.property_id}`);
  return { data: data as Booking, error: null };
}

/**
 * Bulk upsert bookings for a property
 */
export async function bulkUpsertBookings(
  propertyId: string,
  bookings: Omit<UpsertBookingInput, "property_id">[]
): Promise<{ count: number; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("bulkUpsertBookings", { propertyId });
    return { count: 0, error: "Unauthorized" };
  }

  // Verify property ownership
  const { data: property } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("owner_id", user.id)
    .single();

  if (!property) {
    logger.warn("Bulk booking upsert failed - property not found or access denied", {
      userId: user.id,
      propertyId,
    });
    return { count: 0, error: "Property not found" };
  }

  const bookingsWithPropertyId = bookings.map((b) => ({
    property_id: propertyId,
    source: b.source || "ical",
    external_uid: b.external_uid,
    start_date: b.start_date,
    end_date: b.end_date,
    summary: b.summary || null,
    raw: b.raw || null,
  }));

  const { error } = await supabase
    .from("bookings")
    .upsert(bookingsWithPropertyId, {
      onConflict: "property_id,external_uid",
    });

  if (error) {
    logger.apiError("bulkUpsertBookings", error, { userId: user.id, propertyId, count: bookings.length });
    return { count: 0, error: error.message };
  }

  logger.info("Bulk bookings upserted", { userId: user.id, propertyId, count: bookings.length });
  revalidatePath(`/properties/${propertyId}`);
  return { count: bookings.length, error: null };
}

/**
 * List bookings for a property
 */
export async function listBookings(
  propertyId: string,
  options?: { startDate?: string; endDate?: string; limit?: number }
): Promise<{ data: Booking[]; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("listBookings", { propertyId });
    return { data: [], error: "Unauthorized" };
  }

  let query = supabase
    .from("bookings")
    .select("*")
    .eq("property_id", propertyId)
    .order("start_date", { ascending: true });

  if (options?.startDate) {
    query = query.gte("start_date", options.startDate);
  }

  if (options?.endDate) {
    query = query.lte("end_date", options.endDate);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    logger.apiError("listBookings", error, { userId: user.id, propertyId });
    return { data: [], error: error.message };
  }

  return { data: data as Booking[], error: null };
}

/**
 * Get a booking by ID
 */
export async function getBooking(
  id: string
): Promise<{ data: Booking | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("getBooking", { bookingId: id });
    return { data: null, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: "Booking not found" };
    }
    logger.apiError("getBooking", error, { userId: user.id, bookingId: id });
    return { data: null, error: error.message };
  }

  return { data: data as Booking, error: null };
}

/**
 * Update a booking
 */
export async function updateBooking(
  id: string,
  input: UpdateBookingInput
): Promise<{ data: Booking | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("updateBooking", { bookingId: id });
    return { data: null, error: "Unauthorized" };
  }

  const updateData: Record<string, unknown> = {};
  if (input.start_date !== undefined) updateData.start_date = input.start_date;
  if (input.end_date !== undefined) updateData.end_date = input.end_date;
  if (input.summary !== undefined) updateData.summary = input.summary;
  if (input.raw !== undefined) updateData.raw = input.raw;

  if (Object.keys(updateData).length === 0) {
    return { data: null, error: "No fields to update" };
  }

  const { data, error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: "Booking not found" };
    }
    logger.apiError("updateBooking", error, { userId: user.id, bookingId: id });
    return { data: null, error: error.message };
  }

  logger.info("Booking updated", { userId: user.id, bookingId: id });
  
  // Revalidate the property page
  if (data.property_id) {
    revalidatePath(`/properties/${data.property_id}`);
  }
  
  return { data: data as Booking, error: null };
}

/**
 * Delete a booking
 */
export async function deleteBooking(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("deleteBooking", { bookingId: id });
    return { success: false, error: "Unauthorized" };
  }

  // Get booking to find property_id for revalidation
  const { data: booking } = await supabase
    .from("bookings")
    .select("property_id")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", id);

  if (error) {
    logger.apiError("deleteBooking", error, { userId: user.id, bookingId: id });
    return { success: false, error: error.message };
  }

  logger.info("Booking deleted", { userId: user.id, bookingId: id });
  
  if (booking?.property_id) {
    revalidatePath(`/properties/${booking.property_id}`);
  }
  
  return { success: true, error: null };
}

/**
 * Delete all bookings for a property (useful before re-syncing)
 */
export async function deletePropertyBookings(
  propertyId: string,
  source?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("deletePropertyBookings", { propertyId });
    return { success: false, error: "Unauthorized" };
  }

  let query = supabase
    .from("bookings")
    .delete()
    .eq("property_id", propertyId);

  if (source) {
    query = query.eq("source", source);
  }

  const { error } = await query;

  if (error) {
    logger.apiError("deletePropertyBookings", error, { userId: user.id, propertyId, source });
    return { success: false, error: error.message };
  }

  logger.info("Property bookings deleted", { userId: user.id, propertyId, source });
  revalidatePath(`/properties/${propertyId}`);
  return { success: true, error: null };
}


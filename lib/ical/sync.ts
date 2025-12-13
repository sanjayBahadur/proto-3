import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { fetchIcalData, parseIcalData, validateIcalUrl } from "./parser";
import type { SyncSummary, ParsedEvent } from "./types";

export type { SyncSummary };

interface ExistingBooking {
  id: string;
  external_uid: string;
  start_date: string;
  end_date: string;
  summary: string | null;
}

/**
 * Check if a booking needs to be updated
 */
function bookingNeedsUpdate(
  existing: ExistingBooking,
  parsed: ParsedEvent
): boolean {
  const existingStart = new Date(existing.start_date).getTime();
  const existingEnd = new Date(existing.end_date).getTime();
  const parsedStart = parsed.startDate.getTime();
  const parsedEnd = parsed.endDate.getTime();

  // Check if dates changed (allow 1 second tolerance for rounding)
  if (Math.abs(existingStart - parsedStart) > 1000) return true;
  if (Math.abs(existingEnd - parsedEnd) > 1000) return true;

  // Check if summary changed
  if (existing.summary !== parsed.summary) return true;

  return false;
}

/**
 * Sync a property's iCal feed to the bookings table
 * 
 * This function:
 * 1. Fetches the iCal URL
 * 2. Parses VEVENT items
 * 3. Upserts bookings (insert new, update changed)
 * 4. Deletes bookings that no longer exist in the feed
 * 
 * @param propertyId - The property to sync
 * @returns SyncSummary with counts and any errors
 */
export async function syncPropertyCalendar(propertyId: string): Promise<SyncSummary> {
  const startTime = Date.now();
  const summary: SyncSummary = {
    success: false,
    propertyId,
    inserted: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    errors: [],
    duration: 0,
  };

  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      summary.errors.push("Unauthorized: No authenticated user");
      logger.unauthorized("syncPropertyCalendar", { propertyId });
      return finalizeSummary(summary, startTime);
    }

    // Get the property with its iCal URL (also verifies ownership via RLS)
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, name, ical_url, owner_id")
      .eq("id", propertyId)
      .eq("owner_id", user.id)
      .single();

    if (propertyError || !property) {
      summary.errors.push("Property not found or access denied");
      logger.warn("Sync failed - property not found", { userId: user.id, propertyId });
      return finalizeSummary(summary, startTime);
    }

    if (!property.ical_url) {
      summary.errors.push("No iCal URL configured for this property");
      return finalizeSummary(summary, startTime);
    }

    // Validate URL format
    const urlValidation = validateIcalUrl(property.ical_url);
    if (!urlValidation.valid) {
      summary.errors.push(`Invalid iCal URL: ${urlValidation.error}`);
      return finalizeSummary(summary, startTime);
    }

    // Fetch iCal data
    logger.info("Fetching iCal data", { propertyId, url: property.ical_url });
    const { data: icalData, error: fetchError } = await fetchIcalData(property.ical_url);

    if (fetchError || !icalData) {
      summary.errors.push(fetchError || "Failed to fetch iCal data");
      logger.apiError("syncPropertyCalendar:fetch", new Error(fetchError || "Unknown"), { propertyId });
      return finalizeSummary(summary, startTime);
    }

    // Parse iCal data
    const parseResult = parseIcalData(icalData);
    
    if (parseResult.errors.length > 0) {
      // Log parse errors but continue if we got some events
      parseResult.errors.forEach(err => summary.errors.push(`Parse: ${err}`));
    }

    const parsedEvents = parseResult.events;
    logger.info("Parsed iCal events", { propertyId, eventCount: parsedEvents.length });

    if (parsedEvents.length === 0 && parseResult.errors.length > 0) {
      // No events and errors = likely a parse failure
      return finalizeSummary(summary, startTime);
    }

    // Get existing bookings for this property (from iCal source)
    const { data: existingBookings, error: fetchBookingsError } = await supabase
      .from("bookings")
      .select("id, external_uid, start_date, end_date, summary")
      .eq("property_id", propertyId)
      .eq("source", "ical");

    if (fetchBookingsError) {
      summary.errors.push(`Failed to fetch existing bookings: ${fetchBookingsError.message}`);
      logger.apiError("syncPropertyCalendar:fetchBookings", fetchBookingsError, { propertyId });
      return finalizeSummary(summary, startTime);
    }

    const existingByUid = new Map<string, ExistingBooking>(
      (existingBookings || []).map(b => [b.external_uid, b])
    );

    // Track which UIDs we've seen in the new data
    const seenUids = new Set<string>();

    // Process each parsed event
    const toInsert: Array<{
      property_id: string;
      source: string;
      external_uid: string;
      start_date: string;
      end_date: string;
      summary: string | null;
      raw: Record<string, unknown>;
    }> = [];

    const toUpdate: Array<{
      id: string;
      start_date: string;
      end_date: string;
      summary: string | null;
      raw: Record<string, unknown>;
    }> = [];

    for (const event of parsedEvents) {
      seenUids.add(event.uid);

      const existing = existingByUid.get(event.uid);

      if (!existing) {
        // New booking
        toInsert.push({
          property_id: propertyId,
          source: "ical",
          external_uid: event.uid,
          start_date: event.startDate.toISOString(),
          end_date: event.endDate.toISOString(),
          summary: event.summary,
          raw: event.raw,
        });
      } else if (bookingNeedsUpdate(existing, event)) {
        // Existing booking that needs update
        toUpdate.push({
          id: existing.id,
          start_date: event.startDate.toISOString(),
          end_date: event.endDate.toISOString(),
          summary: event.summary,
          raw: event.raw,
        });
      } else {
        summary.unchanged++;
      }
    }

    // Find bookings to delete (exist in DB but not in new feed)
    const toDelete: string[] = [];
    for (const [uid, booking] of existingByUid) {
      if (!seenUids.has(uid)) {
        toDelete.push(booking.id);
      }
    }

    // Perform inserts
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("bookings")
        .insert(toInsert);

      if (insertError) {
        summary.errors.push(`Insert failed: ${insertError.message}`);
        logger.apiError("syncPropertyCalendar:insert", insertError, { propertyId, count: toInsert.length });
      } else {
        summary.inserted = toInsert.length;
      }
    }

    // Perform updates
    for (const update of toUpdate) {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          start_date: update.start_date,
          end_date: update.end_date,
          summary: update.summary,
          raw: update.raw,
        })
        .eq("id", update.id);

      if (updateError) {
        summary.errors.push(`Update failed for booking ${update.id}: ${updateError.message}`);
        logger.apiError("syncPropertyCalendar:update", updateError, { propertyId, bookingId: update.id });
      } else {
        summary.updated++;
      }
    }

    // Perform deletes
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("bookings")
        .delete()
        .in("id", toDelete);

      if (deleteError) {
        summary.errors.push(`Delete failed: ${deleteError.message}`);
        logger.apiError("syncPropertyCalendar:delete", deleteError, { propertyId, count: toDelete.length });
      } else {
        summary.deleted = toDelete.length;
      }
    }

    // Mark as successful if we processed without critical errors
    summary.success = summary.errors.filter(e => !e.startsWith("Parse:")).length === 0;

    logger.info("Calendar sync completed", {
      propertyId,
      inserted: summary.inserted,
      updated: summary.updated,
      deleted: summary.deleted,
      unchanged: summary.unchanged,
      errors: summary.errors.length,
    });

    return finalizeSummary(summary, startTime);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    summary.errors.push(`Sync failed: ${message}`);
    logger.apiError("syncPropertyCalendar", error, { propertyId });
    return finalizeSummary(summary, startTime);
  }
}

function finalizeSummary(summary: SyncSummary, startTime: number): SyncSummary {
  summary.duration = Date.now() - startTime;
  return summary;
}

/**
 * Sync multiple properties (useful for batch operations)
 */
export async function syncMultipleProperties(
  propertyIds: string[]
): Promise<Map<string, SyncSummary>> {
  const results = new Map<string, SyncSummary>();

  for (const propertyId of propertyIds) {
    const summary = await syncPropertyCalendar(propertyId);
    results.set(propertyId, summary);
  }

  return results;
}


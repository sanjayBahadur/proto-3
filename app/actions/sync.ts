"use server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { syncPropertyCalendar, type SyncSummary } from "@/lib/ical";
import { generateCleaningTasks, type CleaningTaskSummary } from "@/lib/tasks";

export type { SyncSummary, CleaningTaskSummary };

export interface FullSyncSummary {
  bookings: SyncSummary;
  tasks: CleaningTaskSummary;
}

/**
 * Sync bookings for a property from its iCal feed
 * 
 * This action:
 * 1. Fetches the property's iCal URL
 * 2. Parses VEVENT items (UID, DTSTART, DTEND, SUMMARY)
 * 3. Normalizes all-day events and timezone handling
 * 4. Upserts bookings using (property_id, external_uid)
 * 5. Deletes bookings that were removed from the calendar
 * 
 * @param propertyId - The property to sync
 * @returns SyncSummary with inserted/updated/deleted counts
 */
export async function syncPropertyBookings(
  propertyId: string
): Promise<SyncSummary> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("syncPropertyBookings", { propertyId });
    return {
      success: false,
      propertyId,
      inserted: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      errors: ["Unauthorized"],
      duration: 0,
    };
  }

  // Verify property ownership
  const { data: property, error } = await supabase
    .from("properties")
    .select("id, name, ical_url")
    .eq("id", propertyId)
    .eq("owner_id", user.id)
    .single();

  if (error || !property) {
    logger.warn("Sync failed - property not found or access denied", {
      userId: user.id,
      propertyId,
    });
    return {
      success: false,
      propertyId,
      inserted: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      errors: ["Property not found"],
      duration: 0,
    };
  }

  if (!property.ical_url) {
    return {
      success: false,
      propertyId,
      inserted: 0,
      updated: 0,
      deleted: 0,
      unchanged: 0,
      errors: ["No iCal URL configured. Add an iCal URL first."],
      duration: 0,
    };
  }

  // Perform the sync
  logger.info("Starting calendar sync", { userId: user.id, propertyId, propertyName: property.name });
  
  const summary = await syncPropertyCalendar(propertyId);

  // Also generate cleaning tasks after sync
  if (summary.success) {
    const taskSummary = await generateCleaningTasks(propertyId);
    logger.info("Cleaning tasks generated after sync", {
      propertyId,
      created: taskSummary.created,
      updated: taskSummary.updated,
    });
  }

  return summary;
}

/**
 * Sync bookings and generate cleaning tasks (full sync)
 * 
 * Returns both booking sync results and task generation results
 */
export async function syncPropertyFull(
  propertyId: string,
  bufferHours: number = 1
): Promise<FullSyncSummary> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emptyBookingSummary: SyncSummary = {
    success: false,
    propertyId,
    inserted: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    errors: [],
    duration: 0,
  };

  const emptyTaskSummary: CleaningTaskSummary = {
    success: false,
    propertyId,
    created: 0,
    updated: 0,
    skipped: 0,
    unchanged: 0,
    errors: [],
    duration: 0,
  };

  if (!user) {
    logger.unauthorized("syncPropertyFull", { propertyId });
    return {
      bookings: { ...emptyBookingSummary, errors: ["Unauthorized"] },
      tasks: { ...emptyTaskSummary, errors: ["Unauthorized"] },
    };
  }

  // Sync bookings first
  const bookingSummary = await syncPropertyCalendar(propertyId);

  // Then generate cleaning tasks
  const taskSummary = await generateCleaningTasks(propertyId, bufferHours);

  return {
    bookings: bookingSummary,
    tasks: taskSummary,
  };
}

/**
 * Generate cleaning tasks for a property (without syncing bookings)
 * 
 * Useful when bookings already exist and you just want to create/update tasks
 */
export async function generatePropertyCleaningTasks(
  propertyId: string,
  bufferHours: number = 1
): Promise<CleaningTaskSummary> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("generatePropertyCleaningTasks", { propertyId });
    return {
      success: false,
      propertyId,
      created: 0,
      updated: 0,
      skipped: 0,
      unchanged: 0,
      errors: ["Unauthorized"],
      duration: 0,
    };
  }

  // Verify property ownership
  const { data: property, error } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .eq("owner_id", user.id)
    .single();

  if (error || !property) {
    logger.warn("Task generation failed - property not found or access denied", {
      userId: user.id,
      propertyId,
    });
    return {
      success: false,
      propertyId,
      created: 0,
      updated: 0,
      skipped: 0,
      unchanged: 0,
      errors: ["Property not found"],
      duration: 0,
    };
  }

  return generateCleaningTasks(propertyId, bufferHours);
}

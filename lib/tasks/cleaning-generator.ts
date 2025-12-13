import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { updatePropertyHealth } from "@/lib/health";

// =============================================================================
// TYPES
// =============================================================================

export interface CleaningTaskSummary {
  success: boolean;
  propertyId: string;
  created: number;
  updated: number;
  skipped: number;
  unchanged: number;
  errors: string[];
  duration: number;
}

interface Booking {
  id: string;
  property_id: string;
  end_date: string;
  summary: string | null;
}

interface ExistingTask {
  id: string;
  created_from_booking_id: string;
  due_at: string;
  status: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_BUFFER_HOURS = 1;

// Statuses that should not be updated
const COMPLETED_STATUSES = ["done", "verified"];

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate cleaning tasks from bookings for a property
 * 
 * For each booking:
 * - Creates a cleaning task due at booking.end_date + buffer hours
 * - Idempotent: won't create duplicates (uses created_from_booking_id)
 * - Updates due_at if booking dates changed (unless task is done/verified)
 * 
 * @param propertyId - The property to generate tasks for
 * @param bufferHours - Hours after checkout for cleaning (default: 1)
 * @returns Summary of created/updated/skipped tasks
 */
export async function generateCleaningTasks(
  propertyId: string,
  bufferHours: number = DEFAULT_BUFFER_HOURS
): Promise<CleaningTaskSummary> {
  const startTime = Date.now();
  const summary: CleaningTaskSummary = {
    success: false,
    propertyId,
    created: 0,
    updated: 0,
    skipped: 0,
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
      logger.unauthorized("generateCleaningTasks", { propertyId });
      return finalizeSummary(summary, startTime);
    }

    // Verify property ownership via RLS
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, name")
      .eq("id", propertyId)
      .eq("owner_id", user.id)
      .single();

    if (propertyError || !property) {
      summary.errors.push("Property not found or access denied");
      logger.warn("Task generation failed - property not found", { userId: user.id, propertyId });
      return finalizeSummary(summary, startTime);
    }

    // Get all bookings for this property (future and recent)
    const now = new Date();
    const pastCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("id, property_id, end_date, summary")
      .eq("property_id", propertyId)
      .gte("end_date", pastCutoff.toISOString())
      .order("end_date", { ascending: true });

    if (bookingsError) {
      summary.errors.push(`Failed to fetch bookings: ${bookingsError.message}`);
      logger.apiError("generateCleaningTasks:fetchBookings", bookingsError, { propertyId });
      return finalizeSummary(summary, startTime);
    }

    if (!bookings || bookings.length === 0) {
      summary.success = true;
      logger.info("No bookings to generate tasks for", { propertyId });
      return finalizeSummary(summary, startTime);
    }

    // Get existing cleaning tasks linked to bookings for this property
    const { data: existingTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, created_from_booking_id, due_at, status")
      .eq("property_id", propertyId)
      .eq("type", "cleaning")
      .not("created_from_booking_id", "is", null);

    if (tasksError) {
      summary.errors.push(`Failed to fetch existing tasks: ${tasksError.message}`);
      logger.apiError("generateCleaningTasks:fetchTasks", tasksError, { propertyId });
      return finalizeSummary(summary, startTime);
    }

    // Map existing tasks by booking ID
    const tasksByBookingId = new Map<string, ExistingTask>(
      (existingTasks || []).map(t => [t.created_from_booking_id!, t])
    );

    // Process each booking
    const toCreate: Array<{
      property_id: string;
      type: string;
      due_at: string;
      status: string;
      created_from_booking_id: string;
    }> = [];

    const toUpdate: Array<{
      id: string;
      due_at: string;
    }> = [];

    for (const booking of bookings) {
      const expectedDueAt = calculateDueAt(booking.end_date, bufferHours);
      const existingTask = tasksByBookingId.get(booking.id);

      if (!existingTask) {
        // No task exists for this booking - create one
        toCreate.push({
          property_id: propertyId,
          type: "cleaning",
          due_at: expectedDueAt,
          status: "open",
          created_from_booking_id: booking.id,
        });
      } else if (COMPLETED_STATUSES.includes(existingTask.status)) {
        // Task is done/verified - don't update
        summary.skipped++;
      } else if (taskNeedsUpdate(existingTask.due_at, expectedDueAt)) {
        // Task exists but due date changed - update it
        toUpdate.push({
          id: existingTask.id,
          due_at: expectedDueAt,
        });
      } else {
        // Task exists and is up to date
        summary.unchanged++;
      }
    }

    // Perform inserts
    if (toCreate.length > 0) {
      const { data: createdTasks, error: insertError } = await supabase
        .from("tasks")
        .insert(toCreate)
        .select("id");

      if (insertError) {
        summary.errors.push(`Insert failed: ${insertError.message}`);
        logger.apiError("generateCleaningTasks:insert", insertError, { propertyId, count: toCreate.length });
      } else {
        summary.created = toCreate.length;

        // Create task events for the new tasks
        if (createdTasks && createdTasks.length > 0) {
          const events = createdTasks.map(task => ({
            task_id: task.id,
            actor_id: user.id,
            from_status: null,
            to_status: "open",
            note: "Auto-generated from booking checkout",
          }));

          const { error: eventsError } = await supabase
            .from("task_events")
            .insert(events);

          if (eventsError) {
            // Non-critical error - log but don't fail
            logger.warn("Failed to create task events", { error: eventsError.message });
          }
        }
      }
    }

    // Perform updates
    for (const update of toUpdate) {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ due_at: update.due_at })
        .eq("id", update.id);

      if (updateError) {
        summary.errors.push(`Update failed for task ${update.id}: ${updateError.message}`);
        logger.apiError("generateCleaningTasks:update", updateError, { propertyId, taskId: update.id });
      } else {
        summary.updated++;
      }
    }

    summary.success = summary.errors.length === 0;

    logger.info("Cleaning task generation completed", {
      propertyId,
      created: summary.created,
      updated: summary.updated,
      skipped: summary.skipped,
      unchanged: summary.unchanged,
      errors: summary.errors.length,
    });

    // Update property health score
    await updatePropertyHealth(propertyId);

    return finalizeSummary(summary, startTime);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    summary.errors.push(`Task generation failed: ${message}`);
    logger.apiError("generateCleaningTasks", error, { propertyId });
    return finalizeSummary(summary, startTime);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate task due date from booking end date + buffer
 */
function calculateDueAt(endDate: string, bufferHours: number): string {
  const date = new Date(endDate);
  date.setTime(date.getTime() + bufferHours * 60 * 60 * 1000);
  return date.toISOString();
}

/**
 * Check if task due date needs to be updated
 * (allows 1 minute tolerance for rounding)
 */
function taskNeedsUpdate(existingDueAt: string, expectedDueAt: string): boolean {
  const existing = new Date(existingDueAt).getTime();
  const expected = new Date(expectedDueAt).getTime();
  return Math.abs(existing - expected) > 60000; // 1 minute tolerance
}

function finalizeSummary(summary: CleaningTaskSummary, startTime: number): CleaningTaskSummary {
  summary.duration = Date.now() - startTime;
  return summary;
}

/**
 * Generate cleaning tasks for multiple properties
 */
export async function generateCleaningTasksForProperties(
  propertyIds: string[],
  bufferHours: number = DEFAULT_BUFFER_HOURS
): Promise<Map<string, CleaningTaskSummary>> {
  const results = new Map<string, CleaningTaskSummary>();

  for (const propertyId of propertyIds) {
    const summary = await generateCleaningTasks(propertyId, bufferHours);
    results.set(propertyId, summary);
  }

  return results;
}


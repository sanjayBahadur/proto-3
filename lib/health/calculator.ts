import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

// =============================================================================
// TYPES
// =============================================================================

export interface HealthScore {
  score: number;
  label: "excellent" | "good" | "fair" | "risky" | "critical";
  color: string;
  overdueCount: number;
  recentCompletions: number;
}

interface CleaningTask {
  id: string;
  due_at: string;
  status: string;
  updated_at: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BASE_SCORE = 100;
const OVERDUE_24H_PENALTY = 10;
const OVERDUE_PER_DAY_PENALTY = 5;
const COMPLETION_BONUS = 10;
const RECENT_COMPLETION_WINDOW_HOURS = 48;

// =============================================================================
// HEALTH CALCULATION
// =============================================================================

/**
 * Calculate health score for a property based on its cleaning tasks
 * 
 * Scoring rules:
 * - Start at 100
 * - For each cleaning task overdue by 24h+: -10
 * - Each additional day overdue: -5 per day
 * - Recent task completions (within 48h): +10 each (up to 100)
 * - Score is capped between 0 and 100
 */
export function calculateHealthScore(tasks: CleaningTask[]): HealthScore {
  const now = new Date();
  let score = BASE_SCORE;
  let overdueCount = 0;
  let recentCompletions = 0;

  for (const task of tasks) {
    const dueAt = new Date(task.due_at);

    if (task.status === "done" || task.status === "verified") {
      // Check if completed recently (within 48 hours)
      const updatedAt = new Date(task.updated_at);
      const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceUpdate <= RECENT_COMPLETION_WINDOW_HOURS) {
        recentCompletions++;
        score += COMPLETION_BONUS;
      }
    } else {
      // Check if task is overdue
      const hoursOverdue = (now.getTime() - dueAt.getTime()) / (1000 * 60 * 60);

      if (hoursOverdue >= 24) {
        overdueCount++;
        // Base penalty for being 24h+ overdue
        score -= OVERDUE_24H_PENALTY;

        // Additional penalty for each day beyond 24h
        const daysOverdue = Math.floor((hoursOverdue - 24) / 24);
        score -= daysOverdue * OVERDUE_PER_DAY_PENALTY;
      }
    }
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    label: getHealthLabel(score),
    color: getHealthColor(score),
    overdueCount,
    recentCompletions,
  };
}

/**
 * Get health label based on score
 */
export function getHealthLabel(score: number): HealthScore["label"] {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  if (score >= 30) return "risky";
  return "critical";
}

/**
 * Get health color based on score
 */
export function getHealthColor(score: number): string {
  if (score >= 90) return "green";
  if (score >= 70) return "blue";
  if (score >= 50) return "yellow";
  if (score >= 30) return "orange";
  return "red";
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Recompute and update health score for a property
 */
export async function updatePropertyHealth(
  propertyId: string
): Promise<{ score: number; error: string | null }> {
  try {
    const supabase = await createClient();

    // Get all tasks for this property (all types affect health)
    const { data: tasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, due_at, status, updated_at")
      .eq("property_id", propertyId)
      .in("type", ["cleaning", "delivery", "restock", "maintenance"]);

    if (fetchError) {
      logger.apiError("updatePropertyHealth:fetchTasks", fetchError, { propertyId });
      return { score: 100, error: fetchError.message };
    }

    // Calculate health score
    const health = calculateHealthScore(tasks || []);

    // Update property health score
    const { error: updateError } = await supabase
      .from("properties")
      .update({ health_score: health.score })
      .eq("id", propertyId);

    if (updateError) {
      logger.apiError("updatePropertyHealth:update", updateError, { propertyId });
      return { score: health.score, error: updateError.message };
    }

    logger.info("Property health updated", {
      propertyId,
      score: health.score,
      label: health.label,
      overdueCount: health.overdueCount,
    });

    return { score: health.score, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.apiError("updatePropertyHealth", error, { propertyId });
    return { score: 100, error: message };
  }
}

/**
 * Get current health details for a property
 */
export async function getPropertyHealth(
  propertyId: string
): Promise<{ data: HealthScore | null; error: string | null }> {
  try {
    const supabase = await createClient();

    // Get all tasks for this property (all types affect health)
    const { data: tasks, error: fetchError } = await supabase
      .from("tasks")
      .select("id, due_at, status, updated_at")
      .eq("property_id", propertyId)
      .in("type", ["cleaning", "delivery", "restock", "maintenance"]);

    if (fetchError) {
      logger.apiError("getPropertyHealth:fetchTasks", fetchError, { propertyId });
      return { data: null, error: fetchError.message };
    }

    const health = calculateHealthScore(tasks || []);
    return { data: health, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { data: null, error: message };
  }
}


import type { SyncSummary } from "./types";

/**
 * Get sync status message for display
 */
export function getSyncStatusMessage(summary: SyncSummary): string {
  if (!summary.success) {
    return summary.errors[0] || "Sync failed";
  }

  const parts: string[] = [];

  if (summary.inserted > 0) {
    parts.push(`${summary.inserted} added`);
  }
  if (summary.updated > 0) {
    parts.push(`${summary.updated} updated`);
  }
  if (summary.deleted > 0) {
    parts.push(`${summary.deleted} removed`);
  }
  if (summary.unchanged > 0) {
    parts.push(`${summary.unchanged} unchanged`);
  }

  if (parts.length === 0) {
    return "No bookings found in calendar";
  }

  return `Sync complete: ${parts.join(", ")}`;
}


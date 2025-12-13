"use client";

import { useState } from "react";
import { syncPropertyBookings, type SyncSummary } from "../actions/sync";
import { getSyncStatusMessage } from "@/lib/ical/utils";
import { ToastContainer, useToast } from "./ui/Toast";

interface SyncBookingsButtonProps {
  propertyId: string;
  hasIcalUrl: boolean;
}

export default function SyncBookingsButton({
  propertyId,
  hasIcalUrl,
}: SyncBookingsButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncSummary | null>(null);
  const { toasts, dismissToast, success, error } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    setLastSync(null);

    try {
      const summary = await syncPropertyBookings(propertyId);
      setLastSync(summary);

      if (summary.success) {
        const parts: string[] = [];
        if (summary.inserted > 0) parts.push(`${summary.inserted} added`);
        if (summary.updated > 0) parts.push(`${summary.updated} updated`);
        if (summary.deleted > 0) parts.push(`${summary.deleted} removed`);
        
        const description = parts.length > 0 
          ? parts.join(", ") 
          : `${summary.unchanged} bookings unchanged`;

        success("Sync Complete", `${description} (${summary.duration}ms)`);
      } else {
        error("Sync Failed", summary.errors[0] || "Unknown error occurred");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      error("Sync Failed", message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing || !hasIcalUrl}
            title={!hasIcalUrl ? "Add an iCal URL first" : undefined}
            className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {isSyncing ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Sync Bookings
              </>
            )}
          </button>

          {lastSync && (
            <span className={`text-xs ${lastSync.success ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {lastSync.success ? "✓" : "✗"} {getSyncStatusMessage(lastSync)}
            </span>
          )}
        </div>

        {!hasIcalUrl && (
          <p className="text-xs text-zinc-500">
            Add an iCal URL above to enable syncing
          </p>
        )}

        {lastSync && lastSync.success && (
          <div className="rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-800/50">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="font-semibold text-green-600 dark:text-green-400">{lastSync.inserted}</div>
                <div className="text-zinc-500">Added</div>
              </div>
              <div>
                <div className="font-semibold text-blue-600 dark:text-blue-400">{lastSync.updated}</div>
                <div className="text-zinc-500">Updated</div>
              </div>
              <div>
                <div className="font-semibold text-red-600 dark:text-red-400">{lastSync.deleted}</div>
                <div className="text-zinc-500">Removed</div>
              </div>
              <div>
                <div className="font-semibold text-zinc-600 dark:text-zinc-400">{lastSync.unchanged}</div>
                <div className="text-zinc-500">Same</div>
              </div>
            </div>
          </div>
        )}

        {lastSync && !lastSync.success && lastSync.errors.length > 0 && (
          <div className="rounded-md bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-200">
            <p className="font-medium">Errors:</p>
            <ul className="mt-1 list-inside list-disc">
              {lastSync.errors.slice(0, 3).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {lastSync.errors.length > 3 && (
                <li>...and {lastSync.errors.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}

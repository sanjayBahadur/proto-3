"use client";

import { useState } from "react";
import { syncPropertyBookings, type SyncSummary } from "../actions/sync";
import { getSyncStatusMessage } from "@/lib/ical/utils";

interface SyncBookingsButtonProps {
  propertyId: string;
  hasIcalUrl: boolean;
}

export default function SyncBookingsButton({
  propertyId,
  hasIcalUrl,
}: SyncBookingsButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<SyncSummary | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setResult(null);

    const summary = await syncPropertyBookings(propertyId);

    setResult(summary);
    setIsSyncing(false);

    // Clear result after 10 seconds
    setTimeout(() => setResult(null), 10000);
  };

  return (
    <div className="space-y-3">
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

      {result && (
        <div
          className={`rounded-md p-3 text-sm ${
            result.success
              ? "bg-green-50 text-green-800 dark:bg-green-950/50 dark:text-green-200"
              : "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200"
          }`}
        >
          <div className="flex items-start gap-2">
            {result.success ? (
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <div>
              <p className="font-medium">{getSyncStatusMessage(result)}</p>
              {result.success && (
                <p className="mt-1 text-xs opacity-75">
                  Completed in {result.duration}ms
                </p>
              )}
              {result.errors.length > 0 && !result.success && (
                <ul className="mt-1 text-xs opacity-75">
                  {result.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {result.errors.length > 3 && (
                    <li>• ...and {result.errors.length - 3} more</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {!hasIcalUrl && (
        <p className="text-xs text-zinc-500">
          Add an iCal URL above to enable syncing
        </p>
      )}
    </div>
  );
}

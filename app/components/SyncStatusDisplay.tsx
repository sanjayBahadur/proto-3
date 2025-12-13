"use client";

import { formatDistanceToNow } from "date-fns";

interface SyncStatusDisplayProps {
  lastSyncAt: string | null;
  lastSyncStatus: "success" | "error" | "pending" | null;
  hasIcalUrl: boolean;
}

export default function SyncStatusDisplay({
  lastSyncAt,
  lastSyncStatus,
  hasIcalUrl,
}: SyncStatusDisplayProps) {
  if (!hasIcalUrl) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>No iCal URL configured</span>
      </div>
    );
  }

  if (!lastSyncAt) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Never synced</span>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true });

  if (lastSyncStatus === "success") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Synced {timeAgo}</span>
      </div>
    );
  }

  if (lastSyncStatus === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Sync failed {timeAgo}</span>
      </div>
    );
  }

  if (lastSyncStatus === "pending") {
    return (
      <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span>Syncing...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Last sync: {timeAgo}</span>
    </div>
  );
}

/**
 * Compact badge version for lists
 */
export function SyncStatusBadge({
  lastSyncStatus,
  hasIcalUrl,
}: {
  lastSyncStatus: "success" | "error" | "pending" | null;
  hasIcalUrl: boolean;
}) {
  if (!hasIcalUrl) {
    return null;
  }

  if (lastSyncStatus === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Synced
      </span>
    );
  }

  if (lastSyncStatus === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-300">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Error
      </span>
    );
  }

  if (lastSyncStatus === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-500" />
        Syncing
      </span>
    );
  }

  return null;
}


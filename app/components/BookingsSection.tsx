"use client";

import { useState } from "react";
import BookingsList from "./BookingsList";
import BookingTimeline from "./BookingTimeline";

interface BookingsSectionProps {
  propertyId: string;
}

type ViewType = "list" | "timeline";

export default function BookingsSection({ propertyId }: BookingsSectionProps) {
  const [view, setView] = useState<ViewType>("timeline");

  return (
    <div>
      {/* View Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Bookings
        </h2>
        <div className="flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
          <button
            onClick={() => setView("timeline")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "timeline"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Timeline
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              view === "list"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            List
          </button>
        </div>
      </div>

      {/* Content */}
      {view === "timeline" ? (
        <BookingTimeline propertyId={propertyId} />
      ) : (
        <BookingsList propertyId={propertyId} />
      )}
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { listBookings, type Booking } from "../actions/bookings";

interface BookingsListProps {
  propertyId: string;
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  
  const startStr = startDate.toLocaleDateString("en-US", options);
  const endStr = endDate.toLocaleDateString("en-US", {
    ...options,
    year: startDate.getFullYear() !== endDate.getFullYear() ? "numeric" : undefined,
  });
  
  // Add year if not current year
  const now = new Date();
  const yearSuffix = startDate.getFullYear() !== now.getFullYear() 
    ? `, ${startDate.getFullYear()}` 
    : "";
  
  return `${startStr} – ${endStr}${yearSuffix}`;
}

function calculateNights(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function getBookingStatus(start: string, end: string): "upcoming" | "current" | "past" {
  const now = new Date();
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  if (endDate < now) return "past";
  if (startDate <= now && endDate >= now) return "current";
  return "upcoming";
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    ical: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    manual: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    airbnb: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    vrbo: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  };
  
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${colors[source] || colors.ical}`}>
      {source}
    </span>
  );
}

function StatusIndicator({ status }: { status: "upcoming" | "current" | "past" }) {
  if (status === "current") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        Now
      </span>
    );
  }
  return null;
}

export default function BookingsList({ propertyId }: BookingsListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      setIsLoading(true);
      setError(null);
      
      // Get bookings from 30 days ago to show recent past bookings
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await listBookings(propertyId, {
        startDate: thirtyDaysAgo.toISOString(),
      });
      
      if (error) {
        setError(error);
      } else {
        // Sort by start date (soonest first)
        const sorted = [...data].sort((a, b) => 
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
        setBookings(sorted);
      }
      
      setIsLoading(false);
    }
    
    fetchBookings();
  }, [propertyId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg
          className="h-6 w-6 animate-spin text-zinc-400"
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
        Failed to load bookings: {error}
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <svg
            className="h-6 w-6 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          No bookings yet
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Sync your iCal feed to import bookings
        </p>
      </div>
    );
  }

  // Separate bookings into upcoming/current and past
  const now = new Date();
  const upcomingAndCurrent = bookings.filter(b => new Date(b.end_date) >= now);
  const past = bookings.filter(b => new Date(b.end_date) < now).reverse(); // Most recent past first

  return (
    <div className="space-y-6">
      {/* Upcoming & Current */}
      {upcomingAndCurrent.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Upcoming ({upcomingAndCurrent.length})
          </h4>
          <div className="space-y-2">
            {upcomingAndCurrent.map((booking) => {
              const status = getBookingStatus(booking.start_date, booking.end_date);
              const nights = calculateNights(booking.start_date, booking.end_date);
              
              return (
                <div
                  key={booking.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    status === "current"
                      ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20"
                      : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {formatDateRange(booking.start_date, booking.end_date)}
                        </p>
                        <StatusIndicator status={status} />
                      </div>
                      {booking.summary && (
                        <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
                          {booking.summary}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {nights} {nights === 1 ? "night" : "nights"}
                      </span>
                      <SourceBadge source={booking.source} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Bookings */}
      {past.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Recent ({past.length})
          </h4>
          <div className="space-y-2">
            {past.slice(0, 5).map((booking) => {
              const nights = calculateNights(booking.start_date, booking.end_date);
              
              return (
                <div
                  key={booking.id}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 opacity-75 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-700 dark:text-zinc-300">
                        {formatDateRange(booking.start_date, booking.end_date)}
                      </p>
                      {booking.summary && (
                        <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-500">
                          {booking.summary}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">
                        {nights} {nights === 1 ? "night" : "nights"}
                      </span>
                      <SourceBadge source={booking.source} />
                    </div>
                  </div>
                </div>
              );
            })}
            {past.length > 5 && (
              <p className="text-center text-xs text-zinc-500">
                +{past.length - 5} more past bookings
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


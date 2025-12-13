"use client";

import { useMemo } from "react";

interface Booking {
  id: string;
  summary: string | null;
  start_date: string;
  end_date: string;
}

interface BookingTimelineProps {
  bookings: Booking[];
  daysToShow?: number;
}

interface TimelineBooking extends Booking {
  startDay: number;
  endDay: number;
  column: number;
  hasOverlap: boolean;
}

export default function BookingTimeline({
  bookings,
  daysToShow = 30,
}: BookingTimelineProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const endDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysToShow);
    return d;
  }, [today, daysToShow]);

  // Generate array of dates for the timeline
  const dates = useMemo(() => {
    const result: Date[] = [];
    const current = new Date(today);
    for (let i = 0; i < daysToShow; i++) {
      result.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return result;
  }, [today, daysToShow]);

  // Process bookings to calculate positions and detect overlaps
  const processedBookings = useMemo(() => {
    const result: TimelineBooking[] = [];

    // Filter bookings that fall within the timeline range
    const relevantBookings = bookings.filter((booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      return end >= today && start <= endDate;
    });

    // Sort by start date
    relevantBookings.sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    // Calculate day positions and detect overlaps
    const columns: { endDay: number }[] = [];

    relevantBookings.forEach((booking) => {
      const startDate = new Date(booking.start_date);
      const endDateBooking = new Date(booking.end_date);

      // Calculate day offset from today
      const startDay = Math.max(
        0,
        Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      );
      const endDay = Math.min(
        daysToShow,
        Math.ceil((endDateBooking.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      );

      // Find a column where this booking fits (no overlap)
      let column = 0;
      let hasOverlap = false;

      for (let i = 0; i < columns.length; i++) {
        if (columns[i].endDay <= startDay) {
          column = i;
          break;
        }
        column = i + 1;
      }

      // Check if there's an overlap with any existing booking
      for (const existingBooking of result) {
        if (
          startDay < existingBooking.endDay &&
          endDay > existingBooking.startDay
        ) {
          hasOverlap = true;
          existingBooking.hasOverlap = true;
        }
      }

      // Update or add column
      if (column < columns.length) {
        columns[column].endDay = endDay;
      } else {
        columns.push({ endDay });
      }

      result.push({
        ...booking,
        startDay,
        endDay,
        column,
        hasOverlap,
      });
    });

    return result;
  }, [bookings, today, endDate, daysToShow]);

  const maxColumns = useMemo(() => {
    return Math.max(1, ...processedBookings.map((b) => b.column + 1));
  }, [processedBookings]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  if (bookings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
        <svg
          className="mx-auto h-8 w-8 text-zinc-400"
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
        <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          No bookings yet
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Sync your calendar to see bookings here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      {processedBookings.some((b) => b.hasOverlap) && (
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-red-500/20 ring-2 ring-red-500"></span>
            <span className="text-zinc-600 dark:text-zinc-400">Overlap detected</span>
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex">
          {/* Date labels column */}
          <div className="flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800">
            {dates.map((date, i) => (
              <div
                key={i}
                className={`flex h-8 items-center justify-end px-3 text-xs ${
                  isToday(date)
                    ? "bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    : isWeekend(date)
                    ? "bg-zinc-50 text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-500"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {formatDate(date)}
              </div>
            ))}
          </div>

          {/* Booking blocks area */}
          <div className="relative flex-1" style={{ minWidth: `${maxColumns * 120}px` }}>
            {/* Grid lines */}
            {dates.map((date, i) => (
              <div
                key={i}
                className={`h-8 border-b border-zinc-100 dark:border-zinc-800 ${
                  isToday(date)
                    ? "bg-blue-50/50 dark:bg-blue-950/30"
                    : isWeekend(date)
                    ? "bg-zinc-50/50 dark:bg-zinc-800/30"
                    : ""
                }`}
              />
            ))}

            {/* Booking blocks */}
            {processedBookings.map((booking) => {
              const top = booking.startDay * 32; // 32px = h-8
              const height = Math.max(32, (booking.endDay - booking.startDay) * 32);
              const left = booking.column * 120 + 4;
              const width = 112;

              return (
                <div
                  key={booking.id}
                  className={`absolute rounded-md px-2 py-1 text-xs shadow-sm transition-all hover:z-10 hover:shadow-md ${
                    booking.hasOverlap
                      ? "bg-red-100 ring-2 ring-red-400 dark:bg-red-900/50 dark:ring-red-500"
                      : "bg-emerald-100 ring-1 ring-emerald-300 dark:bg-emerald-900/50 dark:ring-emerald-600"
                  }`}
                  style={{
                    top: `${top}px`,
                    left: `${left}px`,
                    width: `${width}px`,
                    height: `${height}px`,
                  }}
                  title={`${booking.summary || "Booking"}\n${new Date(
                    booking.start_date
                  ).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}`}
                >
                  <div className="flex h-full flex-col overflow-hidden">
                    <span
                      className={`truncate font-medium ${
                        booking.hasOverlap
                          ? "text-red-800 dark:text-red-200"
                          : "text-emerald-800 dark:text-emerald-200"
                      }`}
                    >
                      {booking.summary || "Booking"}
                    </span>
                    {height > 40 && (
                      <span
                        className={`mt-0.5 truncate text-[10px] ${
                          booking.hasOverlap
                            ? "text-red-600 dark:text-red-300"
                            : "text-emerald-600 dark:text-emerald-300"
                        }`}
                      >
                        {Math.ceil(
                          (new Date(booking.end_date).getTime() -
                            new Date(booking.start_date).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{" "}
                        nights
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          {processedBookings.length} booking{processedBookings.length !== 1 ? "s" : ""} in next{" "}
          {daysToShow} days
        </span>
        {processedBookings.some((b) => b.hasOverlap) && (
          <span className="text-red-600 dark:text-red-400">
            ⚠ {processedBookings.filter((b) => b.hasOverlap).length} overlapping
          </span>
        )}
      </div>
    </div>
  );
}


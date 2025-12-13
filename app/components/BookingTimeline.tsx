"use client";

import { useEffect, useState, useMemo } from "react";
import { listBookings, type Booking } from "../actions/bookings";

interface BookingTimelineProps {
  propertyId: string;
}

interface TimelineBooking extends Booking {
  hasOverlap: boolean;
  overlapGroup: number;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDayOfWeek(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.toDateString() === d2.toDateString();
}

function detectOverlaps(bookings: Booking[]): TimelineBooking[] {
  const result: TimelineBooking[] = bookings.map(b => ({
    ...b,
    hasOverlap: false,
    overlapGroup: 0,
  }));

  // Check each pair of bookings for overlaps
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      const a = result[i];
      const b = result[j];
      
      const aStart = new Date(a.start_date).getTime();
      const aEnd = new Date(a.end_date).getTime();
      const bStart = new Date(b.start_date).getTime();
      const bEnd = new Date(b.end_date).getTime();

      // Check if ranges overlap
      if (aStart < bEnd && bStart < aEnd) {
        result[i].hasOverlap = true;
        result[j].hasOverlap = true;
        // Assign same group
        if (result[i].overlapGroup === 0 && result[j].overlapGroup === 0) {
          result[i].overlapGroup = i + 1;
          result[j].overlapGroup = i + 1;
        } else if (result[i].overlapGroup !== 0) {
          result[j].overlapGroup = result[i].overlapGroup;
        } else {
          result[i].overlapGroup = result[j].overlapGroup;
        }
      }
    }
  }

  return result;
}

function getBookingColor(booking: TimelineBooking, index: number): string {
  if (booking.hasOverlap) {
    return "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700";
  }
  
  const colors = [
    "bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700",
    "bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700",
    "bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700",
    "bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700",
    "bg-cyan-100 border-cyan-300 dark:bg-cyan-900/30 dark:border-cyan-700",
  ];
  
  return colors[index % colors.length];
}

export default function BookingTimeline({ propertyId }: BookingTimelineProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate next 30 days
  const days = useMemo(() => {
    const result: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      result.push(date);
    }
    return result;
  }, []);

  const timelineStart = days[0];
  const timelineEnd = days[days.length - 1];

  useEffect(() => {
    async function fetchBookings() {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await listBookings(propertyId, {
        startDate: timelineStart.toISOString(),
        endDate: new Date(timelineEnd.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      });
      
      if (error) {
        setError(error);
      } else {
        setBookings(data);
      }
      
      setIsLoading(false);
    }
    
    fetchBookings();
  }, [propertyId, timelineStart, timelineEnd]);

  // Process bookings with overlap detection
  const processedBookings = useMemo(() => {
    return detectOverlaps(bookings);
  }, [bookings]);

  // Check if a day falls within a booking
  const getBookingsForDay = (day: Date): TimelineBooking[] => {
    return processedBookings.filter(booking => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      return day >= start && day < end;
    });
  };

  // Check if day is start of a booking
  const isBookingStart = (day: Date, booking: Booking): boolean => {
    const start = new Date(booking.start_date);
    start.setHours(0, 0, 0, 0);
    return isSameDay(day, start);
  };

  // Calculate booking span in days from a given day
  const getBookingSpan = (day: Date, booking: Booking): number => {
    const end = new Date(booking.end_date);
    end.setHours(0, 0, 0, 0);
    const remaining = Math.ceil((end.getTime() - day.getTime()) / (24 * 60 * 60 * 1000));
    // Limit to days remaining in timeline
    const daysUntilTimelineEnd = Math.ceil((timelineEnd.getTime() - day.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return Math.min(remaining, daysUntilTimelineEnd);
  };

  const hasOverlaps = processedBookings.some(b => b.hasOverlap);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg
          className="h-6 w-6 animate-spin text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
        Failed to load timeline: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overlap Warning */}
      {hasOverlaps && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Overlapping bookings detected</span>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Days grid */}
        <div className="space-y-0">
          {days.map((day, dayIndex) => {
            const isToday = isSameDay(day, new Date());
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const dayBookings = getBookingsForDay(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`relative flex min-h-[2.5rem] border-b border-zinc-100 dark:border-zinc-800 ${
                  isWeekend ? "bg-zinc-50/50 dark:bg-zinc-800/20" : ""
                }`}
              >
                {/* Date column */}
                <div
                  className={`flex w-20 flex-shrink-0 items-center gap-1.5 px-2 py-1 text-xs ${
                    isToday
                      ? "font-semibold text-blue-600 dark:text-blue-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  <span className="w-8">{getDayOfWeek(day)}</span>
                  <span>{formatDate(day)}</span>
                  {isToday && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
                  )}
                </div>

                {/* Booking blocks */}
                <div className="relative flex flex-1 items-center gap-1 overflow-hidden py-0.5">
                  {dayBookings.map((booking, bookingIndex) => {
                    const isStart = isBookingStart(day, booking);
                    const span = isStart ? getBookingSpan(day, booking) : 0;
                    const colorClass = getBookingColor(booking, processedBookings.indexOf(booking));
                    
                    if (!isStart) {
                      // Continuation block
                      return (
                        <div
                          key={booking.id}
                          className={`h-7 flex-1 border-y ${colorClass} ${
                            booking.hasOverlap ? "opacity-80" : ""
                          }`}
                        />
                      );
                    }
                    
                    // Start block with label
                    return (
                      <div
                        key={booking.id}
                        className={`group relative z-10 flex h-7 flex-1 items-center overflow-hidden rounded-l border-l-2 border-y pl-2 pr-1 text-xs ${colorClass} ${
                          booking.hasOverlap ? "border-l-red-500" : "border-l-current"
                        }`}
                        title={`${booking.summary || "Booking"} (${span} nights)`}
                      >
                        <span className="truncate font-medium text-zinc-700 dark:text-zinc-200">
                          {booking.summary || "Booking"}
                        </span>
                        <span className="ml-1 flex-shrink-0 text-zinc-500 dark:text-zinc-400">
                          · {span}n
                        </span>
                        {booking.hasOverlap && (
                          <span className="ml-1 text-red-500" title="Overlap">⚠</span>
                        )}
                      </div>
                    );
                  })}
                  
                  {dayBookings.length === 0 && (
                    <div className="h-7 flex-1" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {bookings.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-blue-100 dark:bg-blue-900/30" />
            <span>Booking</span>
          </div>
          {hasOverlaps && (
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-red-100 dark:bg-red-900/30" />
              <span>Overlap</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Today</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {bookings.length === 0 && (
        <div className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No bookings in the next 30 days
        </div>
      )}
    </div>
  );
}

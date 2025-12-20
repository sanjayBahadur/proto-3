import ICAL from "ical.js";
import type { ParsedEvent, ParseResult } from "./types";

export type { ParsedEvent, ParseResult };

/**
 * Fetch iCal data from a URL
 */
export async function fetchIcalData(url: string): Promise<{ data: string | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Comfort-Curators-Calendar-Sync/1.0",
        Accept: "text/calendar, application/calendar+json, */*",
      },
      // Timeout after 30 seconds
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return {
        data: null,
        error: `Failed to fetch iCal: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.text();

    if (!data.includes("BEGIN:VCALENDAR")) {
      return {
        data: null,
        error: "Invalid iCal data: Missing VCALENDAR",
      };
    }

    return { data, error: null };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.name === "TimeoutError") {
        return { data: null, error: "Request timed out after 30 seconds" };
      }
      return { data: null, error: `Fetch error: ${error.message}` };
    }
    return { data: null, error: "Unknown fetch error" };
  }
}

/**
 * Parse an ICAL.Time to a JavaScript Date, handling timezones and all-day events
 */
function icalTimeToDate(icalTime: ICAL.Time, isAllDay: boolean): Date {
  if (isAllDay) {
    // For all-day events, use the date parts directly (no timezone conversion)
    return new Date(Date.UTC(
      icalTime.year,
      icalTime.month - 1, // JS months are 0-indexed
      icalTime.day,
      0, 0, 0, 0
    ));
  }

  // For timed events, convert to JavaScript Date
  // ical.js handles timezone conversion when we use toJSDate()
  try {
    return icalTime.toJSDate();
  } catch {
    // Fallback: construct from components
    return new Date(Date.UTC(
      icalTime.year,
      icalTime.month - 1,
      icalTime.day,
      icalTime.hour || 0,
      icalTime.minute || 0,
      icalTime.second || 0
    ));
  }
}

/**
 * Check if an event is an all-day event
 */
function isAllDayEvent(vevent: ICAL.Event): boolean {
  const dtstart = vevent.component.getFirstPropertyValue("dtstart") as ICAL.Time | null;

  if (!dtstart) return false;

  // All-day events have DATE type (not DATE-TIME)
  return dtstart.isDate === true;
}

/**
 * Extract UID from a VEVENT, with fallback generation
 */
function extractUid(vevent: ICAL.Event, index: number): string {
  const uid = vevent.uid;

  if (uid && typeof uid === "string" && uid.trim().length > 0) {
    return uid.trim();
  }

  // Fallback: generate a UID from event details
  const dtstart = vevent.startDate;
  const summary = vevent.summary || "";

  if (dtstart) {
    const dateStr = `${dtstart.year}${dtstart.month}${dtstart.day}`;
    return `generated-${dateStr}-${summary.slice(0, 20).replace(/\W/g, "")}-${index}`;
  }

  return `generated-event-${index}`;
}

/**
 * Parse iCal data and extract events
 */
export function parseIcalData(icalData: string): ParseResult {
  const events: ParsedEvent[] = [];
  const errors: string[] = [];

  try {
    // Parse the iCal data
    const jcalData = ICAL.parse(icalData);
    const vcalendar = new ICAL.Component(jcalData);

    // Get all VEVENT components
    const vevents = vcalendar.getAllSubcomponents("vevent");

    if (vevents.length === 0) {
      return { events: [], errors: ["No events found in calendar"] };
    }

    vevents.forEach((veventComponent, index) => {
      try {
        const vevent = new ICAL.Event(veventComponent);

        // Extract start and end dates
        const startDate = vevent.startDate;
        const endDate = vevent.endDate;

        if (!startDate) {
          errors.push(`Event ${index}: Missing start date`);
          return;
        }

        // Determine if all-day event
        const allDay = isAllDayEvent(vevent);

        // Get end date, default to start date + 1 day for all-day events
        let parsedEndDate: Date;
        if (endDate) {
          parsedEndDate = icalTimeToDate(endDate, allDay);
        } else if (allDay) {
          // All-day event without end: assume 1 day duration
          const endTime = startDate.clone();
          endTime.addDuration(new ICAL.Duration({ days: 1 }));
          parsedEndDate = icalTimeToDate(endTime, allDay);
        } else {
          // Timed event without end: assume same as start
          parsedEndDate = icalTimeToDate(startDate, allDay);
        }

        const parsedStartDate = icalTimeToDate(startDate, allDay);

        // Extract UID
        const uid = extractUid(vevent, index);

        // Build raw data for storage
        const raw: Record<string, unknown> = {
          uid: vevent.uid,
          summary: vevent.summary,
          description: vevent.description,
          location: vevent.location,
          status: veventComponent.getFirstPropertyValue("status"),
          categories: veventComponent.getFirstPropertyValue("categories"),
          isAllDay: allDay,
          originalStart: startDate.toString(),
          originalEnd: endDate?.toString(),
        };

        // Remove undefined values
        Object.keys(raw).forEach(key => {
          if (raw[key] === undefined || raw[key] === null) {
            delete raw[key];
          }
        });

        events.push({
          uid,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          summary: vevent.summary || null,
          isAllDay: allDay,
          raw,
        });
      } catch (eventError) {
        const message = eventError instanceof Error ? eventError.message : "Unknown error";
        errors.push(`Event ${index}: ${message}`);
      }
    });

    return { events, errors };
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : "Unknown parse error";
    return { events: [], errors: [`Failed to parse iCal data: ${message}`] };
  }
}

/**
 * Validate an iCal URL format
 */
export function validateIcalUrl(url: string): { valid: boolean; error: string | null } {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL is required" };
  }

  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "URL must use http or https protocol" };
    }

    if (!parsed.pathname.toLowerCase().endsWith(".ics")) {
      return { valid: false, error: "URL must end with .ics" };
    }

    return { valid: true, error: null };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}


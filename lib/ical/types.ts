/**
 * Shared types for iCal sync operations
 */

export interface SyncSummary {
  success: boolean;
  propertyId: string;
  inserted: number;
  updated: number;
  deleted: number;
  unchanged: number;
  errors: string[];
  duration: number;
}

export interface ParsedEvent {
  uid: string;
  startDate: Date;
  endDate: Date;
  summary: string | null;
  isAllDay: boolean;
  raw: Record<string, unknown>;
}

export interface ParseResult {
  events: ParsedEvent[];
  errors: string[];
}


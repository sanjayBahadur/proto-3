"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { updateProperty, type Property } from "../actions/properties";
import { getNextBooking } from "../actions/bookings";
import { HealthScoreBadge } from "./HealthScoreDisplay";
import type { UserRole } from "@/lib/supabase/roles";

interface PropertySidePanelProps {
  property: Property | null;
  onClose: () => void;
  userRole: UserRole | null;
}

interface NextBookingData {
  start_date: string;
  end_date: string;
  summary: string | null;
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function calculateNights(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
}

function isCurrentBooking(start: string, end: string): boolean {
  const now = new Date();
  return new Date(start) <= now && new Date(end) >= now;
}

export default function PropertySidePanel({
  property,
  onClose,
  userRole,
}: PropertySidePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  // Next booking state
  const [nextBooking, setNextBooking] = useState<NextBookingData | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);

  const canEdit = userRole === "manager" || userRole === "admin";

  // Fetch next booking when property changes
  useEffect(() => {
    if (!property) {
      setNextBooking(null);
      return;
    }

    async function fetchNextBooking() {
      setLoadingBooking(true);
      const { data } = await getNextBooking(property!.id);
      setNextBooking(data);
      setLoadingBooking(false);
    }

    fetchNextBooking();
  }, [property?.id]);

  if (!property) return null;

  const startEditing = () => {
    setName(property.name);
    setAddress(property.address || "");
    setIsEditing(true);
    setError(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!canEdit) {
      setError("Only managers can edit properties");
      return;
    }

    if (!name.trim()) {
      setError("Property name is required");
      return;
    }

    setError(null);
    setIsSaving(true);

    const { error } = await updateProperty(property.id, {
      name: name.trim(),
      address: address.trim() || null,
    });

    if (error) {
      setError(error);
      setIsSaving(false);
      return;
    }

    setIsEditing(false);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="absolute right-0 top-0 z-[1000] h-full w-80 border-l border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {isEditing ? "Edit Property" : "Property Details"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
              {error}
            </div>
          )}

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Property name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Address <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="123 Main Street"
                />
              </div>
              <div className="rounded-md bg-zinc-100 p-3 dark:bg-zinc-800">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Coordinates
                </label>
                <p className="mt-1 font-mono text-sm text-zinc-600 dark:text-zinc-400">
                  {property.lat.toFixed(6)}, {property.lng.toFixed(6)}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Location cannot be changed. Delete and recreate to move.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Name
                </label>
                <p className="mt-1 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {property.name}
                </p>
              </div>

              {property.address && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Address
                  </label>
                  <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                    {property.address}
                  </p>
                </div>
              )}

              {/* Health Score */}
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Health
                </label>
                <div className="mt-1.5">
                  <HealthScoreBadge score={property.health_score} />
                </div>
              </div>

              {/* Next Booking */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Next Booking
                </label>
                {loadingBooking ? (
                  <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading...
                  </div>
                ) : nextBooking ? (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      {isCurrentBooking(nextBooking.start_date, nextBooking.end_date) && (
                        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          Now
                        </span>
                      )}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {formatDateShort(nextBooking.start_date)} – {formatDateShort(nextBooking.end_date)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {calculateNights(nextBooking.start_date, nextBooking.end_date)} nights
                      {nextBooking.summary && ` · ${nextBooking.summary}`}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    No upcoming bookings
                  </p>
                )}
              </div>

              {/* Next Cleaning (Placeholder) */}
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-700 dark:bg-zinc-800/30">
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Next Cleaning
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Coming soon
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Task scheduling not yet implemented
                </p>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Coordinates
                </label>
                <p className="mt-1 font-mono text-sm text-zinc-600 dark:text-zinc-400">
                  {property.lat.toFixed(6)}, {property.lng.toFixed(6)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 rounded-md bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={cancelEditing}
                className="flex-1 rounded-md border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href={`/properties/${property.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View Details
              </Link>
              {canEdit && (
                <button
                  onClick={startEditing}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Property
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

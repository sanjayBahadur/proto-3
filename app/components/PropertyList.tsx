"use client";

import { useState } from "react";
import Link from "next/link";
import {
  deleteProperty,
  updateProperty,
  type Property,
} from "../actions/properties";
import type { UserRole } from "@/lib/supabase/roles";
import LoadingSpinner from "./ui/LoadingSpinner";
import EmptyState from "./ui/EmptyState";

interface PropertyListProps {
  properties: Property[];
  userRole: UserRole | null;
}

export default function PropertyList({
  properties,
  userRole,
}: PropertyListProps) {
  const canEdit = userRole === "manager";

  if (properties.length === 0) {
    return (
      <EmptyState
        icon={
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        }
        title="No properties yet"
        description={
          canEdit
            ? 'Click "Claim Property" on the map or use "+ Add Property" to add your first property.'
            : "Properties will appear here once added by a manager."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}

function PropertyCard({
  property,
  canEdit,
}: {
  property: Property;
  canEdit: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(property.name);
  const [address, setAddress] = useState(property.address || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleDelete = async () => {
    if (!canEdit) {
      setError("Only managers can delete properties");
      return;
    }
    if (!confirm("Are you sure you want to delete this property?")) return;

    setIsDeleting(true);
    setError(null);
    const { error } = await deleteProperty(property.id);
    if (error) {
      setError(error);
      setIsDeleting(false);
    }
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
  };

  const handleCancel = () => {
    setName(property.name);
    setAddress(property.address || "");
    setIsEditing(false);
    setError(null);
  };

  const handleStartEdit = () => {
    if (!canEdit) {
      setError("Only managers can edit properties");
      return;
    }
    setName(property.name);
    setAddress(property.address || "");
    setIsEditing(true);
    setError(null);
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
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
            {error}
          </div>
        )}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Property name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Address <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              placeholder="Address"
            />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Location: {property.lat.toFixed(6)}, {property.lng.toFixed(6)}
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {isSaving && <LoadingSpinner size="sm" className="text-white dark:text-zinc-900" />}
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
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
          {error}
        </div>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href={`/properties/${property.id}`}
            className="font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
          >
            {property.name}
          </Link>
          {property.address && (
            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
              {property.address}
            </p>
          )}
          <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-500">
            {property.lat.toFixed(6)}, {property.lng.toFixed(6)}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-shrink-0 gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={handleStartEdit}
              className="rounded px-2 py-1 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1 rounded px-2 py-1 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-950/50"
            >
              {isDeleting && <LoadingSpinner size="sm" className="text-red-500" />}
              {isDeleting ? "..." : "Delete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

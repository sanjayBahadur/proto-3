"use client";

import { useState } from "react";
import { createProperty } from "../actions/properties";

interface ClaimPropertyPanelProps {
  lat: number;
  lng: number;
  onSave: () => void;
  onCancel: () => void;
}

export default function ClaimPropertyPanel({
  lat,
  lng,
  onSave,
  onCancel,
}: ClaimPropertyPanelProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Property name is required");
      return;
    }

    setIsSaving(true);

    const { error } = await createProperty({
      name: name.trim(),
      address: address.trim() || undefined,
      lat,
      lng,
    });

    if (error) {
      setError(error);
      setIsSaving(false);
      return;
    }

    onSave();
  };

  return (
    <div className="absolute right-0 top-0 z-[1000] h-full w-80 border-l border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-emerald-50 px-4 py-3 dark:border-zinc-700 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
              <svg
                className="h-3.5 w-3.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">
              Claim Property
            </h3>
          </div>
          <button
            onClick={onCancel}
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
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="mb-4 rounded-md bg-zinc-100 p-3 dark:bg-zinc-800">
              <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Location
              </label>
              <p className="mt-1 font-mono text-sm text-zinc-700 dark:text-zinc-300">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Property Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Enter property name"
                  autoFocus
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
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="123 Main Street"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-md bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Property"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 rounded-md border border-zinc-300 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


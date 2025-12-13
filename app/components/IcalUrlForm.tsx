"use client";

import { useState } from "react";
import { updatePropertyIcalUrl } from "../actions/properties";

interface IcalUrlFormProps {
  propertyId: string;
  currentUrl: string | null;
}

export default function IcalUrlForm({
  propertyId,
  currentUrl,
}: IcalUrlFormProps) {
  const [url, setUrl] = useState(currentUrl || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validateUrl = (value: string): string | null => {
    if (!value.trim()) return null; // Empty is valid

    try {
      const parsed = new URL(value);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return "URL must start with http:// or https://";
      }
      if (!parsed.pathname.toLowerCase().endsWith(".ics")) {
        return "URL must end with .ics";
      }
      return null;
    } catch {
      return "Please enter a valid URL";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validateUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    const { success, error } = await updatePropertyIcalUrl(
      propertyId,
      url.trim() || null
    );

    if (error) {
      setError(error);
      setIsSaving(false);
      return;
    }

    if (success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }

    setIsSaving(false);
  };

  const handleClear = async () => {
    setUrl("");
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    const { success, error } = await updatePropertyIcalUrl(propertyId, null);

    if (error) {
      setError(error);
    } else if (success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }

    setIsSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-md bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-2 text-sm text-green-600 dark:bg-green-950/50 dark:text-green-400">
          iCal URL saved successfully
        </div>
      )}

      <div>
        <label
          htmlFor="ical_url"
          className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          iCal Feed URL
        </label>
        <input
          id="ical_url"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
            setSuccess(false);
          }}
          placeholder="https://example.com/calendar.ics"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Enter a URL ending with .ics to sync calendar data
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isSaving ? "Saving..." : "Save URL"}
        </button>
        {url && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isSaving}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}


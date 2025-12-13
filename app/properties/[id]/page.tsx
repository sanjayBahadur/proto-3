import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/supabase/roles";
import { getProperty } from "@/app/actions/properties";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import IcalUrlForm from "@/app/components/IcalUrlForm";
import SyncBookingsButton from "@/app/components/SyncBookingsButton";
import BookingsSection from "@/app/components/BookingsSection";
import ManagerTaskList from "@/app/components/ManagerTaskList";
import HealthScoreDisplay from "@/app/components/HealthScoreDisplay";
import SyncStatusDisplay from "@/app/components/SyncStatusDisplay";

interface PropertyPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check user role
  const role = await getCurrentUserRole();
  if (role !== "manager") {
    redirect("/dashboard");
  }

  // Get property (ownership is checked in the action)
  const { data: property, error } = await getProperty(id);

  if (error || !property) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li>
            <Link
              href="/dashboard"
              className="hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Dashboard
            </Link>
          </li>
          <li>/</li>
          <li className="text-zinc-900 dark:text-zinc-100">{property.name}</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {property.name}
        </h1>
        {property.address && (
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            {property.address}
          </p>
        )}
      </div>

      {/* Property Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Info Card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Property Details
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">Name</dt>
              <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {property.name}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                Address
              </dt>
              <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {property.address || (
                  <span className="text-zinc-400">No address provided</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                Coordinates
              </dt>
              <dd className="mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                {property.lat.toFixed(6)}, {property.lng.toFixed(6)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-zinc-500 dark:text-zinc-400">
                Created
              </dt>
              <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                {new Date(property.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
            </div>
          </dl>
        </div>

        {/* Location Card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Location
          </h2>
          <div className="flex h-40 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <div className="text-center">
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
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="mt-2 text-sm text-zinc-500">Map preview</p>
            </div>
          </div>
          <a
            href={`https://www.google.com/maps?q=${property.lat},${property.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Open in Google Maps
          </a>
        </div>

        {/* iCal URL Card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Calendar Integration
          </h2>
          <div className="space-y-4">
            <IcalUrlForm propertyId={property.id} currentUrl={property.ical_url} />
            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <SyncBookingsButton propertyId={property.id} hasIcalUrl={!!property.ical_url} />
            </div>
            <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <SyncStatusDisplay
                lastSyncAt={property.last_sync_at}
                lastSyncStatus={property.last_sync_status}
                hasIcalUrl={!!property.ical_url}
              />
            </div>
          </div>
        </div>

        {/* Health Score Card */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Health Score
          </h2>
          <HealthScoreDisplay score={property.health_score} />
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Based on task completion and overdue items
          </p>
        </div>

        {/* Package Card (Placeholder) */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-2">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Selected Package
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
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
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                No package selected
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Choose a service package for this property
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Tasks
        </h2>
        <ManagerTaskList propertyId={property.id} propertyName={property.name} />
      </div>

      {/* Bookings Section */}
      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <BookingsSection propertyId={property.id} />
      </div>

      {/* Actions */}
      <div className="mt-8 flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

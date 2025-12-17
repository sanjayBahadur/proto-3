
import { requireManagerOrAdmin } from "@/lib/supabase/roles";
import { listProperties } from "@/app/actions/properties";
import { listOrganizations, type Organization } from "@/app/actions/admin";
import RoleBadge from "../components/RoleBadge";
import PropertyList from "../components/PropertyList";
import PropertyMapSection from "../components/PropertyMapSection";
import Card from "../components/ui/Card";
import OrgFilter from "./components/OrgFilter";
import Link from "next/link";

interface DashboardPageProps {
  searchParams: Promise<{
    orgId?: string;
  }>;
}

export default async function DashboardPage(props: DashboardPageProps) {
  const searchParams = await props.searchParams;
  const orgId = searchParams.orgId;

  // Only managers and admins can access dashboard
  const currentUser = await requireManagerOrAdmin("/login");
  const role = currentUser.profile.role;

  // Fetch Data
  const { data: properties, error: propertiesError } = await listProperties(orgId);

  let organizations: Organization[] = [];
  if (role === 'admin') {
    const { data } = await listOrganizations();
    organizations = data;
  }

  const canManageProperties = role === "manager" || role === "admin";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Dashboard
            </h1>
            {role && <RoleBadge role={role} />}
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Welcome back, {currentUser.email}
          </p>
        </div>

        {/* Admin Organization Filter */}
        {role === 'admin' && (
          <div className="w-full sm:w-auto">
            <OrgFilter organizations={organizations} />
          </div>
        )}
      </header>

      {/* Error Banner */}
      {propertiesError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">Failed to load properties</p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{propertiesError}</p>
          </div>
        </div>
      )}

      {/* Stats Grid - Same as before but potentially filtered numbers */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Total Properties</p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{properties.length}</p>
            </div>
          </div>
        </Card>
        {/* ... Other stats (Active Sessions hardcoded to 1, Role) ... */}
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Your Role</p>
              <p className="text-2xl font-semibold capitalize text-zinc-900 dark:text-zinc-100">{role || "—"}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Organization</p>
              <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                {/* If admin and filtering, show filter name. Else 'All' or User Org */}
                {role === 'admin'
                  ? (orgId ? organizations.find(o => o.id === orgId)?.name || 'Filtered' : 'All')
                  : 'My Org'
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Map Section */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">Property Map</h2>
        <PropertyMapSection properties={properties} userRole={role} />
        {properties.length === 0 && !propertiesError && (
          <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No properties found</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {canManageProperties ? 'Use "Claim Property" to add one' : 'No properties in this view'}
            </p>
          </div>
        )}
      </section>

      {/* Properties List Section */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {role === "admin" ? (orgId ? "Filtered Properties" : "All Properties") : "Organization Properties"}
          </h2>
          {/* REMOVED CreatePropertyForm */}
        </div>
        <PropertyList properties={properties} userRole={role} />
      </section>

      {/* ... Role specific cards (Admin Access / Manager Tools) ... */}
    </div>
  );
}

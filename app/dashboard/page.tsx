import { requireManagerOrAdmin } from "@/lib/supabase/roles";
import { listProperties } from "@/app/actions/properties";
import RoleBadge from "../components/RoleBadge";
import CreatePropertyForm from "../components/CreatePropertyForm";
import PropertyList from "../components/PropertyList";
import PropertyMapSection from "../components/PropertyMapSection";
import Card from "../components/ui/Card";

export default async function DashboardPage() {
  // Only managers and admins can access dashboard
  const currentUser = await requireManagerOrAdmin("/login");
  const role = currentUser.profile.role;

  // Get properties
  const { data: properties, error: propertiesError } = await listProperties();

  const canManageProperties = role === "manager" || role === "admin";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Dashboard
          </h1>
          {role && <RoleBadge role={role} />}
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Welcome back, {currentUser.email}
        </p>
      </header>

      {/* Error Banner */}
      {propertiesError && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500"
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
          <div>
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Failed to load properties
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">
              {propertiesError}
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <svg
                className="h-5 w-5 text-zinc-600 dark:text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Total Properties
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {properties.length}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <svg
                className="h-5 w-5 text-zinc-600 dark:text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Active Sessions
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                1
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <svg
                className="h-5 w-5 text-zinc-600 dark:text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Your Role
              </p>
              <p className="text-2xl font-semibold capitalize text-zinc-900 dark:text-zinc-100">
                {role || "—"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Map Section */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Property Map
        </h2>
        <PropertyMapSection properties={properties} userRole={role} />
        {properties.length === 0 && !propertiesError && (
          <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/50 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
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
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              No properties yet
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {canManageProperties
                ? 'Click "Claim Property" then click on the map to add your first property'
                : "Properties will appear here once added by a manager"}
            </p>
          </div>
        )}
      </section>

      {/* Properties List Section */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            {role === "admin" ? "All Properties" : "Your Properties"}
          </h2>
          {canManageProperties && <CreatePropertyForm />}
        </div>
        <PropertyList properties={properties} userRole={role} />
      </section>

      {/* Role-specific content */}
      {role === "admin" && (
        <section>
          <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
                <svg
                  className="h-5 w-5 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-medium text-purple-900 dark:text-purple-100">
                  Admin Access
                </h2>
                <p className="mt-1 text-sm text-purple-700 dark:text-purple-300">
                  You have full administrative access. Visit the{" "}
                  <a href="/admin" className="underline hover:text-purple-900">
                    Admin Dashboard
                  </a>{" "}
                  to manage users and organizations.
                </p>
              </div>
            </div>
          </Card>
        </section>
      )}
      {role === "manager" && (
        <section>
          <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                <svg
                  className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-medium text-indigo-900 dark:text-indigo-100">
                  Manager Tools
                </h2>
                <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-300">
                  You have access to administrative features including property
                  creation, editing, and calendar sync.
                </p>
              </div>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/roles";
import Link from "next/link";

export default async function AdminPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // Get counts for dashboard
  const [
    { count: userCount },
    { count: propertyCount },
    { count: orgCount },
    { count: packageCount },
    { count: warehouseCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("properties").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("organizations").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("packages").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("warehouse_items").select("*", { count: "exact", head: true }).is("deleted_at", null),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back, {user?.email?.split('@')[0]}
        </p>
      </header>

      {/* Stats Grid */}
      <section className="mb-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Users" value={userCount || 0} color="blue" />
          <StatCard label="Properties" value={propertyCount || 0} color="emerald" />
          <StatCard label="Organizations" value={orgCount || 0} color="amber" />
          <StatCard label="Packages" value={packageCount || 0} color="purple" />
          <StatCard label="Inventory Items" value={warehouseCount || 0} color="orange" />
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Manage
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            href="/admin/users"
            title="Users"
            description="Manage accounts & roles"
            icon={<UsersIcon />}
          />
          <QuickActionCard
            href="/admin/organizations"
            title="Organizations"
            description="Create & edit organizations"
            icon={<BuildingIcon />}
          />
          <QuickActionCard
            href="/dashboard"
            title="Properties"
            description="View all properties"
            icon={<MapIcon />}
          />
          <QuickActionCard
            href="/admin/warehouse"
            title="Warehouse"
            description="Manage inventory items"
            icon={<BoxIcon />}
            accent="amber"
          />
          <QuickActionCard
            href="/admin/packages"
            title="Package Builder"
            description="Create delivery bundles"
            icon={<PackageIcon />}
            accent="purple"
          />
        </div>
      </section>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const bgColors: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20",
    amber: "bg-amber-50 dark:bg-amber-900/20",
    purple: "bg-purple-50 dark:bg-purple-900/20",
    orange: "bg-orange-50 dark:bg-orange-900/20",
  };
  const textColors: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    purple: "text-purple-600 dark:text-purple-400",
    orange: "text-orange-600 dark:text-orange-400",
  };

  return (
    <div className={`rounded-xl p-4 ${bgColors[color]}`}>
      <p className={`text-xs font-medium uppercase tracking-wide ${textColors[color]}`}>{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({
  href,
  title,
  description,
  icon,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  const accentBorder = accent === "amber"
    ? "hover:border-amber-300 dark:hover:border-amber-700"
    : accent === "purple"
      ? "hover:border-purple-300 dark:hover:border-purple-700"
      : "hover:border-zinc-300 dark:hover:border-zinc-600";

  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 ${accentBorder}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-zinc-700">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{title}</h3>
        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <svg
        className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

// Icons
const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const MapIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const BoxIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const PackageIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

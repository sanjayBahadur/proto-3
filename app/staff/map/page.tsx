import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/roles";
import StaffMapSection from "./StaffMapSection";
import Link from "next/link";

export default async function StaffMapPage() {
  // Staff and admin can access this page
  await requireRole(["staff", "admin"], "/login");
  const supabase = await createClient();

  // Get org properties (RLS will filter based on user's org)
  const { data: properties, error } = await supabase
    .from("properties")
    .select("id, name, address, lat, lng, health_score")
    .order("name", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-2">
          <Link href="/staff" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            Staff Portal
          </Link>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-100">Property Map</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Property Map
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          View properties in your organization
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load properties: {error.message}
          </p>
        </div>
      )}

      {/* Map */}
      <StaffMapSection properties={properties || []} />

      {/* Legend */}
      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          About This View
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          This map shows all properties in your organization. Click on a property pin
          to view details. You can view tasks for properties you have assignments on.
        </p>
      </div>
    </div>
  );
}

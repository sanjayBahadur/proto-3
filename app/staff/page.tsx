import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole, ensureUserProfile } from "@/lib/supabase/roles";
import { redirect } from "next/navigation";
import RoleBadge from "../components/RoleBadge";

export default async function StaffPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Ensure profile exists
  await ensureUserProfile(user.id);

  // Check user role - only staff can access this page
  const role = await getCurrentUserRole();

  if (role !== "staff") {
    // Managers should go to dashboard
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Staff Portal
          </h1>
          {role && <RoleBadge role={role} />}
        </div>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Welcome, {user.email}
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <svg
            className="h-8 w-8 text-zinc-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Tasks coming soon.
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Your assigned tasks and work orders will appear here.
        </p>
      </div>

      {/* Staff Info Card */}
      <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
        <h2 className="text-lg font-medium text-emerald-900 dark:text-emerald-100">
          Staff Access
        </h2>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
          You have staff-level access. Contact your manager for additional
          permissions.
        </p>
      </div>
    </div>
  );
}


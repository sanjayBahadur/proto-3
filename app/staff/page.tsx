import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole, ensureUserProfile } from "@/lib/supabase/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import RoleBadge from "../components/RoleBadge";
import { getMyTasks } from "../actions/tasks";

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

  // Get task counts
  const { data: tasks } = await getMyTasks();
  const activeTasks = tasks.filter((t) => !["done", "verified"].includes(t.status));
  const urgentTasks = activeTasks.filter((t) => {
    const dueAt = new Date(t.due_at);
    const now = new Date();
    return dueAt <= new Date(now.getTime() + 24 * 60 * 60 * 1000); // Due within 24 hours
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
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

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Active Tasks</p>
          <p className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
            {activeTasks.length}
          </p>
        </div>
        <div className={`rounded-lg border p-4 ${
          urgentTasks.length > 0
            ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30"
            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        }`}>
          <p className={`text-sm ${
            urgentTasks.length > 0
              ? "text-red-600 dark:text-red-400"
              : "text-zinc-500 dark:text-zinc-400"
          }`}>
            Due Soon
          </p>
          <p className={`mt-1 text-3xl font-semibold ${
            urgentTasks.length > 0
              ? "text-red-700 dark:text-red-300"
              : "text-zinc-900 dark:text-zinc-100"
          }`}>
            {urgentTasks.length}
          </p>
        </div>
      </div>

      {/* Tasks Link */}
      <Link
        href="/staff/tasks"
        className="group flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
              My Tasks
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {activeTasks.length > 0
                ? `${activeTasks.length} active task${activeTasks.length !== 1 ? "s" : ""}`
                : "No active tasks"}
            </p>
          </div>
        </div>
        <svg
          className="h-5 w-5 text-zinc-400 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>

      {/* Urgent Tasks Alert */}
      {urgentTasks.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">
                Tasks due soon
              </h4>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                You have {urgentTasks.length} task{urgentTasks.length !== 1 ? "s" : ""} due within 24 hours.
              </p>
              <Link
                href="/staff/tasks"
                className="mt-2 inline-block text-sm font-medium text-red-800 underline hover:text-red-900 dark:text-red-200 dark:hover:text-red-100"
              >
                View tasks →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Staff Info Card */}
      <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <h2 className="font-medium text-emerald-900 dark:text-emerald-100">
          Staff Access
        </h2>
        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
          Contact your manager for task assignments or additional permissions.
        </p>
      </div>
    </div>
  );
}


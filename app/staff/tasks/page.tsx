import { requireRole } from "@/lib/supabase/roles";
import { getMyTasksWithProperty } from "@/app/actions/tasks";
import StaffTaskList from "./StaffTaskList";
import Link from "next/link";

export default async function StaffTasksPage() {
  // Staff and admin can access this page
  await requireRole(["staff", "admin"], "/login");

  // Get tasks assigned to this user
  const { data: tasks, error } = await getMyTasksWithProperty();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-2">
          <Link href="/staff" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            Staff Portal
          </Link>
          <span>/</span>
          <span className="text-zinc-900 dark:text-zinc-100">My Tasks</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          My Tasks
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          View and update your assigned tasks
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          Failed to load tasks: {error}
        </div>
      ) : (
        <StaffTaskList initialTasks={tasks} />
      )}
    </div>
  );
}


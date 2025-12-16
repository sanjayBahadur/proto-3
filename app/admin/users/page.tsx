import { listAllUsers, listOrganizations } from "@/app/actions/admin";
import { getCurrentUser } from "@/lib/supabase/roles";
import UserTable from "./UserTable";

export default async function AdminUsersPage() {
  const [currentUser, { data: users, error }, { data: organizations }] =
    await Promise.all([
      getCurrentUser(),
      listAllUsers(),
      listOrganizations(),
    ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          User Management
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          View and manage user accounts, roles, and status
        </p>
      </header>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load users: {error}
          </p>
        </div>
      )}

      {/* Users Table */}
      <UserTable
        users={users}
        organizations={organizations}
        currentUserId={currentUser?.id || ""}
      />

      {/* Help Text */}
      <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
          Role Permissions
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <li>
            <strong className="text-purple-600 dark:text-purple-400">Admin:</strong>{" "}
            Full system access, manage users, organizations, and all data
          </li>
          <li>
            <strong className="text-indigo-600 dark:text-indigo-400">Manager:</strong>{" "}
            Manage properties, create tasks, assign staff, run booking sync
          </li>
          <li>
            <strong className="text-emerald-600 dark:text-emerald-400">Staff:</strong>{" "}
            View assigned tasks, update task status, view org properties on map
          </li>
        </ul>
      </div>
    </div>
  );
}

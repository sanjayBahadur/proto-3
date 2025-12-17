import { listAllUsers, listOrganizations } from "@/app/actions/admin";
import { getCurrentUser, type UserRole } from "@/lib/supabase/roles";
import UserTable from "./UserTable";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    query?: string;
    sort?: string;
    order?: string;
    role?: string;
    orgId?: string;
  }>;
}

export default async function AdminUsersPage(props: PageProps) {
  const searchParams = await props.searchParams;

  const page = Number(searchParams.page) || 1;
  const query = searchParams.query || "";
  const sort = searchParams.sort || "created_at";
  const order = (searchParams.order === "asc" ? "asc" : "desc") as "asc" | "desc";
  const role = searchParams.role as UserRole | undefined;
  const orgId = searchParams.orgId || undefined;

  const [currentUser, { data: users, count, error }, { data: organizations }] =
    await Promise.all([
      getCurrentUser(),
      listAllUsers({ page, limit: 10, query, sort, order, role, orgId }),
      listOrganizations(),
    ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            User Management
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View and manage user accounts, roles, and status
          </p>
        </div>
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
        totalCount={count}
        organizations={organizations}
        currentUserId={currentUser?.id || ""}
      />

      {/* Help Text */}
      <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
          Role Permissions Reference
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-purple-500"></span>
              <strong className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Admin</strong>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Full system access. Can manage users, organizations, and sensitive settings.</p>
          </div>
          <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
              <strong className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Manager</strong>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Restricted to one organization. Can manage properties, tasks, and staff assignments.</p>
          </div>
          <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <strong className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Staff</strong>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Can belong to multiple organizations. View assigned tasks and properties.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  toggleUserDisabled,
  type AdminUser,
  type Organization,
} from "@/app/actions/admin";
import type { UserRole } from "@/lib/supabase/roles";
import EditUserModal from "./EditUserModal";

interface UserTableProps {
  users: AdminUser[];
  totalCount: number;
  organizations: Organization[];
  currentUserId: string;
}

export default function UserTable({
  users,
  totalCount,
  organizations,
  currentUserId,
}: UserTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // URL Params State
  const page = Number(searchParams.get("page")) || 1;
  const query = searchParams.get("query") || "";
  const sort = searchParams.get("sort") || "created_at";
  const order = searchParams.get("order") === "asc" ? "asc" : "desc";
  const roleFilter = searchParams.get("role") || "";
  const orgFilter = searchParams.get("orgId") || "";

  const limit = 10;
  const totalPages = Math.ceil(totalCount / limit);

  // Debounced Search
  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Debounce logic parameters
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQuery !== query) {
        updateUrl({ query: localQuery, page: 1 });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localQuery, query]); // eslint-disable-next-line react-hooks/exhaustive-deps

  const updateUrl = useCallback(
    (updates: { [key: string]: string | number | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      router.push(pathname + "?" + params.toString());
    },
    [router, pathname, searchParams]
  );

  const handleSort = (column: string) => {
    const isSameColumn = sort === column;
    const newOrder = isSameColumn && order === 'asc' ? 'desc' : 'asc';
    updateUrl({ sort: column, order: newOrder });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      updateUrl({ page: newPage });
    }
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrl({ role: e.target.value, page: 1 });
  };

  const handleOrgFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateUrl({ orgId: e.target.value, page: 1 });
  };

  const handleToggleDisabled = async (userId: string, currentDisabled: boolean) => {
    setLoading(userId);
    setError(null);
    const result = await toggleUserDisabled(userId, !currentDisabled);
    setLoading(null);
    if (result.error) {
      setError(result.error);
    }
  };

  const getRoleBadgeClasses = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300";
      case "manager":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300";
      case "staff":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
    }
  };

  const getOrgDisplay = (user: AdminUser) => {
    if (user.role === 'admin') return <span className="text-zinc-400 text-xs">All Access</span>;

    const orgIds = user.org_ids || (user.org_id ? [user.org_id] : []);
    if (orgIds.length === 0) return <span className="text-zinc-400 text-xs italic">No Organization</span>;

    const orgNames = orgIds.map(id => organizations.find(o => o.id === id)?.name).filter(Boolean);

    if (orgNames.length === 1) {
      return <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate block max-w-[200px]" title={orgNames[0]}>{orgNames[0]}</span>;
    }
    return (
      <div className="flex flex-col">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{orgIds.length} Organizations</span>
        <span className="text-xs text-zinc-500 truncate max-w-[200px] block" title={orgNames.join(", ")}>
          {orgNames.join(", ")}
        </span>
      </div>
    );
  };

  const renderSortArrow = (column: string) => {
    if (sort !== column) return <span className="text-zinc-300 ml-1">↕</span>;
    return order === 'asc' ? <span className="ml-1 text-zinc-600">↑</span> : <span className="ml-1 text-zinc-600">↓</span>;
  };

  return (
    <div className="space-y-4">
      {/* Controls: Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            className="block w-full rounded-md border border-zinc-200 bg-white py-2 pl-10 pr-3 text-sm placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-600 shadow-sm"
            placeholder="Search by email..."
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Role:</label>
            <select
              value={roleFilter}
              onChange={handleRoleFilterChange}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 shadow-sm"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Org:</label>
            <select
              value={orgFilter}
              onChange={handleOrgFilterChange}
              className="max-w-[200px] rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 shadow-sm"
            >
              <option value="">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          {(roleFilter || orgFilter || query) && (
            <button
              onClick={() => updateUrl({ role: "", orgId: "", query: "", page: 1 })}
              className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-medium underline hover:no-underline">Dismiss</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <th
                onClick={() => handleSort('email')}
                className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
              >
                User {renderSortArrow('email')}
              </th>
              <th
                onClick={() => handleSort('role')}
                className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
              >
                Role {renderSortArrow('role')}
              </th>
              <th
                onClick={() => handleSort('organization')}
                className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
              >
                Organization {renderSortArrow('organization')}
              </th>
              <th
                onClick={() => handleSort('status')}
                className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
              >
                Status {renderSortArrow('status')}
              </th>
              <th
                onClick={() => handleSort('joined')}
                className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
              >
                Joined {renderSortArrow('joined')}
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              const isAdmin = user.role === "admin";
              const isLoading = loading === user.id;

              return (
                <tr
                  key={user.id}
                  className={`${user.disabled
                    ? "bg-zinc-50 dark:bg-zinc-900/50"
                    : "bg-white dark:bg-zinc-900"
                    } ${isLoading ? "opacity-50" : ""} hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors`}
                >
                  {/* User Info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-zinc-100 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700">
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          {(user.email?.[0] || "?").toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 max-w-[200px]">
                        <p
                          className={`truncate text-sm font-medium ${user.disabled
                            ? "text-zinc-400 line-through dark:text-zinc-500"
                            : "text-zinc-900 dark:text-zinc-100"
                            }`}
                          title={user.email || ""}
                        >
                          {user.email || "No email"}
                        </p>
                        {isCurrentUser && (
                          <span className="text-xs text-zinc-500 font-medium">(You)</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClasses(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </td>

                  {/* Organization */}
                  <td className="px-4 py-3">
                    {getOrgDisplay(user)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {user.disabled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/50 dark:text-red-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Disabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/50 dark:text-green-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Active
                      </span>
                    )}
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {!isCurrentUser && !isAdmin && (
                        <button
                          onClick={() =>
                            handleToggleDisabled(user.id, user.disabled)
                          }
                          disabled={isLoading}
                          className={`text-xs font-medium px-2 py-1 rounded transition-colors ${user.disabled
                            ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                            : "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            }`}
                        >
                          {user.disabled ? "Enable" : "Disable"}
                        </button>
                      )}

                      {!isCurrentUser && (
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-xs font-medium text-zinc-600 px-2 py-1 rounded hover:bg-zinc-100 transition-colors dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        >
                          Edit
                        </button>
                      )}

                      {isCurrentUser && (
                        <span className="text-xs text-zinc-400 px-2">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-8 w-8 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <p>No users found matching your filters.</p>

                    <button
                      onClick={() => updateUrl({ role: "", orgId: "", query: "", page: 1 })}
                      className="text-purple-600 hover:text-purple-700 underline text-xs"
                    >
                      Clear all filters
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Showing <span className="font-medium">{users.length}</span> of <span className="font-medium">{totalCount}</span> results
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-600 dark:text-zinc-400 px-2">
            Page {page} of {totalPages || 1}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border border-zinc-300 px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Next
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          organizations={organizations}
          onClose={() => setEditingUser(null)}
          onSuccess={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}

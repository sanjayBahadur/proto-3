"use client";

import { useState } from "react";
import {
  updateUserRole,
  toggleUserDisabled,
  updateUserOrg,
  type AdminUser,
  type Organization,
} from "@/app/actions/admin";
import type { UserRole } from "@/lib/supabase/roles";

interface UserTableProps {
  users: AdminUser[];
  organizations: Organization[];
  currentUserId: string;
}

export default function UserTable({
  users,
  organizations,
  currentUserId,
}: UserTableProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoading(userId);
    setError(null);
    const result = await updateUserRole(userId, newRole);
    setLoading(null);
    if (result.error) {
      setError(result.error);
    }
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

  const handleOrgChange = async (userId: string, orgId: string) => {
    setLoading(userId);
    setError(null);
    const result = await updateUserOrg(userId, orgId || null);
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

  return (
    <div>
      {/* Error Banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Organization
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Joined
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
                  className={`${
                    user.disabled
                      ? "bg-zinc-50 dark:bg-zinc-900/50"
                      : "bg-white dark:bg-zinc-900"
                  } ${isLoading ? "opacity-50" : ""}`}
                >
                  {/* User Info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                          {(user.email?.[0] || "?").toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            user.disabled
                              ? "text-zinc-400 line-through dark:text-zinc-500"
                              : "text-zinc-900 dark:text-zinc-100"
                          }`}
                        >
                          {user.email || "No email"}
                        </p>
                        {isCurrentUser && (
                          <span className="text-xs text-zinc-500">(You)</span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3">
                    {isAdmin || isCurrentUser ? (
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClasses(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    ) : (
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value as UserRole)
                        }
                        disabled={isLoading}
                        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="manager">manager</option>
                        <option value="staff">staff</option>
                      </select>
                    )}
                  </td>

                  {/* Organization */}
                  <td className="px-4 py-3">
                    <select
                      value={user.org_id || ""}
                      onChange={(e) => handleOrgChange(user.id, e.target.value)}
                      disabled={isLoading}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="">No organization</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
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
                    {!isCurrentUser && !isAdmin && (
                      <button
                        onClick={() =>
                          handleToggleDisabled(user.id, user.disabled)
                        }
                        disabled={isLoading}
                        className={`text-xs font-medium ${
                          user.disabled
                            ? "text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                            : "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        }`}
                      >
                        {user.disabled ? "Enable" : "Disable"}
                      </button>
                    )}
                    {isCurrentUser && (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                    {isAdmin && !isCurrentUser && (
                      <span className="text-xs text-zinc-400">Protected</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {users.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        Showing {users.length} user{users.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

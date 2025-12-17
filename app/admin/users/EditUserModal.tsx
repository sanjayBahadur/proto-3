"use client";

import { useState, useEffect } from "react";
import { type AdminUser, type Organization, updateUserOrgs, updateUserRole, updateUserPassword, deleteUser } from "@/app/actions/admin";
import { type UserRole } from "@/lib/supabase/roles";

interface EditUserModalProps {
    user: AdminUser;
    organizations: Organization[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditUserModal({ user, organizations, onClose, onSuccess }: EditUserModalProps) {
    const [role, setRole] = useState<UserRole>(user.role);
    const [selectedOrgs, setSelectedOrgs] = useState<string[]>(user.org_ids || (user.org_id ? [user.org_id] : []));
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Reset selected orgs when role changes if constraints dictate
        // e.g. if switching to Manager, ensure only 1 is selected?
        // Let's rely on validation/UI restrictions
        if (role === 'manager' && selectedOrgs.length > 1) {
            setSelectedOrgs([selectedOrgs[0]]);
        }
    }, [role, selectedOrgs]);

    const handleOrgToggle = (orgId: string) => {
        if (role === 'manager') {
            // Single select behavior
            setSelectedOrgs([orgId]);
        } else {
            // Multi select behavior
            setSelectedOrgs(prev =>
                prev.includes(orgId) ? prev.filter(id => id !== orgId) : [...prev, orgId]
            );
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setError(null);

        try {
            // 1. Update Role if changed
            if (role !== user.role) {
                const roleRes = await updateUserRole(user.id, role);
                if (roleRes.error) throw new Error(roleRes.error);
            }

            // 2. Update Orgs
            // Check equality
            const currentOrgs = user.org_ids || (user.org_id ? [user.org_id] : []);
            const orgsChanged =
                selectedOrgs.length !== currentOrgs.length ||
                !selectedOrgs.every(id => currentOrgs.includes(id));

            // Always call if role changed to enforce manager/staff logic, or if orgs actually changed
            if (orgsChanged || role !== user.role) {
                const orgRes = await updateUserOrgs(user.id, selectedOrgs, role);
                if (orgRes.error) throw new Error(orgRes.error);
            }

            // 3. Update Password if provided
            if (newPassword) {
                if (newPassword !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                if (newPassword.length < 6) {
                    throw new Error("Password must be at least 6 characters");
                }
                const passRes = await updateUserPassword(user.id, newPassword);
                if (passRes.error) throw new Error(passRes.error);
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        setLoading(true);
        setError(null);
        const res = await deleteUser(user.id);
        setLoading(false);
        if (res.error) {
            setError(res.error);
        } else {
            onSuccess();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Edit User: {user.email}
                    </h2>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <svg className="h-5 w-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="max-h-[80vh] overflow-y-auto p-4">
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                disabled={loading || user.role === 'admin'} // Can't change admin role logic here if complex, kept simple
                                className="mt-1 block w-full rounded-md border border-zinc-300 p-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                            >
                                <option value="manager">Manager (Single Org)</option>
                                <option value="staff">Staff (Multi Org)</option>
                                {user.role === 'admin' && <option value="admin">Admin</option>}
                            </select>
                        </div>

                        {/* Organization Selection */}
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                Organizations
                            </label>
                            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border border-zinc-200 p-2 dark:border-zinc-700">
                                {organizations.map(org => {
                                    const isSelected = selectedOrgs.includes(org.id);
                                    return (
                                        <label key={org.id} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-50 p-1 rounded dark:hover:bg-zinc-800">
                                            <input
                                                type={role === 'manager' ? "radio" : "checkbox"}
                                                name="org_select"
                                                checked={isSelected}
                                                onChange={() => handleOrgToggle(org.id)}
                                                disabled={loading}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                                            />
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300">{org.name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                                {role === 'manager' ? 'Managers can only belong to one organization.' : 'Staff can be assigned to multiple organizations.'}
                            </p>
                        </div>

                        {/* Password Reset */}
                        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Reset Password</h3>
                            <div className="mt-2 grid grid-cols-2 gap-4">
                                <div>
                                    <input
                                        type="password"
                                        placeholder="New Password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="block w-full rounded-md border border-zinc-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="password"
                                        placeholder="Confirm Password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full rounded-md border border-zinc-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Delete User Zone */}
                        <div className="border-t border-red-200 pt-4 dark:border-red-900/50">
                            <h3 className="text-sm font-medium text-red-600 dark:text-red-400">Danger Zone</h3>
                            {!isDeleting ? (
                                <button
                                    type="button"
                                    onClick={() => setIsDeleting(true)}
                                    className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                                >
                                    Delete User
                                </button>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                        Type <strong>delete</strong> to confirm deletion. This cannot be undone.
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={deleteConfirmation}
                                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                                            className="block w-full rounded-md border border-red-300 p-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-red-800 dark:bg-zinc-800"
                                            placeholder="Type 'delete'"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            disabled={deleteConfirmation !== 'delete'}
                                            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setIsDeleting(false); setDeleteConfirmation(""); }}
                                            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-zinc-200 p-4 dark:border-zinc-800">
                    <button
                        onClick={onClose}
                        className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        {loading ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}

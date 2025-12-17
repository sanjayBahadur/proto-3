"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
    createOrganization,
    updateOrganization,
    deleteOrganization,
    type Organization
} from "@/app/actions/admin";

interface OrgTableProps {
    organizations: Organization[];
    totalCount: number;
}

export default function OrgTable({ organizations, totalCount }: OrgTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // URL Params
    const page = Number(searchParams.get("page")) || 1;
    const query = searchParams.get("query") || "";
    const sort = searchParams.get("sort") || "name";
    const order = searchParams.get("order") === "desc" ? "desc" : "asc";

    const limit = 10;
    const totalPages = Math.ceil(totalCount / limit);

    // Local State
    const [localQuery, setLocalQuery] = useState(query);
    const [loading, setLoading] = useState<string | null>(null); // For delete/action loading
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [modalName, setModalName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Debounce Search
    useEffect(() => {
        setLocalQuery(query);
    }, [query]);

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

    // Modal Handlers
    const openCreateModal = () => {
        setEditingOrg(null);
        setModalName("");
        setModalError(null);
        setIsModalOpen(true);
    };

    const openEditModal = (org: Organization) => {
        setEditingOrg(org);
        setModalName(org.name);
        setModalError(null);
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setModalError(null);

        let result;
        if (editingOrg) {
            result = await updateOrganization(editingOrg.id, modalName);
        } else {
            result = await createOrganization(modalName);
        }

        setIsSubmitting(false);

        if (result.error) {
            setModalError(result.error);
        } else {
            setIsModalOpen(false);
            setEditingOrg(null);
            setModalName("");
            router.refresh();
        }
    };

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

    const openDeleteModal = (org: Organization) => {
        setOrgToDelete(org);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!orgToDelete) return;

        setLoading(orgToDelete.id);
        setError(null);
        setIsDeleteModalOpen(false); // Close immediately or wait? Wait usually better but let's close for optimistic feel + loader in table

        const result = await deleteOrganization(orgToDelete.id);

        if (result.error) {
            setError(result.error);
        } else {
            router.refresh();
        }
        setLoading(null);
        setOrgToDelete(null);
    };

    const renderSortArrow = (column: string) => {
        if (sort !== column) return <span className="text-zinc-300 ml-1">↕</span>;
        return order === 'asc' ? <span className="ml-1 text-zinc-600">↑</span> : <span className="ml-1 text-zinc-600">↓</span>;
    };

    return (
        <div className="mx-auto max-w-5xl px-4 py-8">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Organization Management
                    </h1>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Create, manage, and delete organizations
                    </p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:bg-purple-600 dark:hover:bg-purple-700"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Organization
                </button>
            </div>

            {/* Controls: Search */}
            <div className="mb-4 flex items-center justify-between">
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
                        placeholder="Search organizations..."
                    />
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200 flex justify-between items-center">
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
                                onClick={() => handleSort('name')}
                                className="cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
                            >
                                Name {renderSortArrow('name')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                ID
                            </th>
                            <th
                                onClick={() => handleSort('created_at')}
                                className="cursor-pointer px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
                            >
                                Created {renderSortArrow('created_at')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {organizations.map((org) => (
                            <tr
                                key={org.id}
                                className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors ${loading === org.id ? "opacity-50" : ""}`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold text-xs">
                                            {org.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{org.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400 font-mono text-xs">
                                    {org.id}
                                </td>
                                <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                                    {new Date(org.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => openEditModal(org)}
                                            className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => openDeleteModal(org)}
                                            disabled={loading === org.id}
                                            className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 disabled:opacity-50"
                                        >
                                            {loading === org.id ? "Deleting..." : "Delete"}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {organizations.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                    No organizations found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800 mt-4">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Showing <span className="font-medium">{organizations.length}</span> of <span className="font-medium">{totalCount}</span> results
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

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {editingOrg ? 'Edit Organization' : 'Create New Organization'}
                        </h3>

                        <form onSubmit={handleModalSubmit} className="mt-4">
                            {modalError && (
                                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                                    {modalError}
                                </div>
                            )}

                            <div className="mb-4">
                                <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={modalName}
                                    onChange={(e) => setModalName(e.target.value)}
                                    required
                                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Saving..." : (editingOrg ? "Save Changes" : "Create")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && orgToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                        <div className="mb-4 flex items-center gap-3 text-red-600">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Confirm Deletion</h3>
                        </div>

                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            Are you sure you want to delete <strong>{orgToDelete.name}</strong>?
                            <br /><br />
                            This will archive the organization and hide it from this list.
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                                Delete Organization
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

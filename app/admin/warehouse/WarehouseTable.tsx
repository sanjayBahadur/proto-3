"use client";

import { useState } from "react";
import { WarehouseItem, createWarehouseItem, updateWarehouseItem, deleteWarehouseItem } from "@/app/actions/warehouse";
import { useRouter } from "next/navigation";

interface WarehouseTableProps {
    items: WarehouseItem[];
}

export default function WarehouseTable({ items }: WarehouseTableProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [sku, setSku] = useState("");
    const [description, setDescription] = useState("");
    const [totalStock, setTotalStock] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openCreateModal = () => {
        setEditingItem(null);
        setName("");
        setSku("");
        setDescription("");
        setTotalStock(0);
        setIsModalOpen(true);
    };

    const openEditModal = (item: WarehouseItem) => {
        setEditingItem(item);
        setName(item.name);
        setSku(item.sku || "");
        setDescription(item.description || "");
        setTotalStock(item.total_stock);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const data = { name, sku, description, total_stock: totalStock };

        if (editingItem) {
            await updateWarehouseItem(editingItem.id, data);
        } else {
            await createWarehouseItem(data);
        }

        setIsSubmitting(false);
        setIsModalOpen(false);
        router.refresh();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this item?")) return; // Replace with custom modal later if desired
        await deleteWarehouseItem(id);
        router.refresh();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Warehouse Inventory</h1>
                    <p className="text-sm text-zinc-500">Manage items available for packages</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    Add Item
                </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
                    <thead className="bg-zinc-50 text-xs uppercase text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        <tr>
                            <th className="px-6 py-3 font-medium">Name</th>
                            <th className="px-6 py-3 font-medium">SKU</th>
                            <th className="px-6 py-3 font-medium">Stock</th>
                            <th className="px-6 py-3 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                    {item.name}
                                    {item.description && <p className="text-xs text-zinc-500 font-normal">{item.description}</p>}
                                </td>
                                <td className="px-6 py-4">{item.sku || "-"}</td>
                                <td className="px-6 py-4">{item.total_stock}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => openEditModal(item)} className="mr-3 text-purple-600 hover:underline">Edit</button>
                                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">No items in warehouse.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
                        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {editingItem ? "Edit Item" : "New Item"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">SKU (Optional)</label>
                                <input
                                    value={sku}
                                    onChange={e => setSku(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800"
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Total Stock</label>
                                <input
                                    type="number"
                                    value={totalStock}
                                    onChange={e => setTotalStock(Number(e.target.value))}
                                    className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
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
                                    {isSubmitting ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

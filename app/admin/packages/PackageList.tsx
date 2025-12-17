"use client";

import { useState } from "react";
import { Package, PackageItem, createPackage, deletePackage } from "@/app/actions/packages";
import { WarehouseItem } from "@/app/actions/warehouse";
import { useRouter } from "next/navigation";

interface PackageListProps {
    packages: Package[];
    warehouseItems: WarehouseItem[];
}

export default function PackageList({ packages, warehouseItems }: PackageListProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [triggerType, setTriggerType] = useState("booking_end");
    const [selectedItems, setSelectedItems] = useState<{ itemId: string; quantity: number }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helper to add item to selection
    const addItem = (itemId: string) => {
        if (selectedItems.find(i => i.itemId === itemId)) return;
        setSelectedItems([...selectedItems, { itemId, quantity: 1 }]);
    };

    const updateQuantity = (itemId: string, qty: number) => {
        if (qty < 1) {
            setSelectedItems(selectedItems.filter(i => i.itemId !== itemId));
        } else {
            setSelectedItems(selectedItems.map(i => i.itemId === itemId ? { ...i, quantity: qty } : i));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        await createPackage(
            name,
            description,
            triggerType,
            selectedItems.map(i => ({ item_id: i.itemId, quantity: i.quantity }))
        );

        setIsSubmitting(false);
        setIsModalOpen(false);
        resetForm();
        router.refresh();
    };

    const resetForm = () => {
        setName("");
        setDescription("");
        setTriggerType("booking_end");
        setSelectedItems([]);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this package?")) return;
        await deletePackage(id);
        router.refresh();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Package Management</h1>
                    <p className="text-sm text-zinc-500">Create bundles for property distribution</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
                >
                    Create Package
                </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {packages.map((pkg) => (
                    <div key={pkg.id} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="mb-4 flex items-start justify-between">
                            <div>
                                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{pkg.name}</h3>
                                <span className="inline-flex mt-1 items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400">
                                    {pkg.trigger_type.replace('_', ' ')}
                                </span>
                            </div>
                            <button onClick={() => handleDelete(pkg.id)} className="text-zinc-400 hover:text-red-600">
                                <span className="sr-only">Delete</span>
                                🗑️
                            </button>
                        </div>
                        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                            {pkg.description || "No description"}
                        </p>

                        <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                            <h4 className="mb-2 text-xs font-medium uppercase text-zinc-500">Contains {pkg.package_items?.length || 0} items:</h4>
                            <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                                {pkg.package_items?.slice(0, 3).map((pi: any) => (
                                    <li key={pi.id} className="flex justify-between">
                                        <span>{pi.item?.name || "Unknown Item"}</span>
                                        <span className="text-zinc-400">x{pi.quantity}</span>
                                    </li>
                                ))}
                                {(pkg.package_items?.length || 0) > 3 && (
                                    <li className="text-xs italic text-zinc-400">...and more</li>
                                )}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl dark:bg-zinc-900">
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Create New Package</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="create-package-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Package Name</label>
                                        <input
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800"
                                            required
                                            placeholder="e.g. Standard Turnover Kit"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800"
                                            rows={2}
                                            placeholder="What is this package for?"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Trigger Type</label>
                                        <select
                                            value={triggerType}
                                            onChange={e => setTriggerType(e.target.value)}
                                            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800"
                                        >
                                            <option value="booking_end">Booking End (Turnover)</option>
                                            <option value="daily">Daily Cron</option>
                                            <option value="weekly">Weekly Cron</option>
                                            <option value="manual">Manual Only</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
                                    <h3 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">Package Contents</h3>

                                    <div className="mb-4">
                                        <label className="mb-1 block text-xs text-zinc-500">Add Items from Warehouse</label>
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    addItem(e.target.value);
                                                    e.target.value = "";
                                                }
                                            }}
                                            className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                                        >
                                            <option value="">Select an item to add...</option>
                                            {warehouseItems.map(item => (
                                                <option key={item.id} value={item.id} disabled={!!selectedItems.find(i => i.itemId === item.id)}>
                                                    {item.name} ({item.total_stock} in stock)
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2 rounded-md bg-zinc-50 p-3 dark:bg-zinc-800/50">
                                        {selectedItems.length === 0 ? (
                                            <p className="text-center text-sm text-zinc-500">No items added yet.</p>
                                        ) : (
                                            selectedItems.map((item) => {
                                                const warehouseItem = warehouseItems.find(w => w.id === item.itemId);
                                                return (
                                                    <div key={item.itemId} className="flex items-center justify-between rounded bg-white p-2 shadow-sm dark:bg-zinc-800">
                                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{warehouseItem?.name}</span>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => updateQuantity(item.itemId, parseInt(e.target.value))}
                                                                className="w-16 rounded border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => updateQuantity(item.itemId, 0)}
                                                                className="text-zinc-400 hover:text-red-500"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="border-t border-zinc-200 p-6 dark:border-zinc-800">
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
                                    form="create-package-form"
                                    disabled={isSubmitting || selectedItems.length === 0}
                                    className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Creating..." : "Create Package"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { listPropertyPackages, togglePropertyPackage } from "@/app/actions/packages";
import { Property } from "@/app/actions/properties";

interface PackageWithSub {
    id: string;
    name: string;
    description: string | null;
    trigger_type: string;
    package_items?: Array<{ id: string; quantity: number; item?: { name: string } }>;
    subscription: { active: boolean } | null;
}

interface Props {
    properties: Property[];
}

export default function ManagerPackageView({ properties }: Props) {
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || "");
    const [packages, setPackages] = useState<PackageWithSub[]>([]);
    const [loading, setLoading] = useState(false);
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => {
        if (selectedPropertyId) {
            fetchPackages(selectedPropertyId);
        }
    }, [selectedPropertyId]);

    const fetchPackages = async (propertyId: string) => {
        setLoading(true);
        const data = await listPropertyPackages(propertyId);
        if (Array.isArray(data)) {
            setPackages(data as PackageWithSub[]);
        }
        setLoading(false);
    };

    const handleToggle = async (pkgId: string, currentActive: boolean) => {
        setToggling(pkgId);
        await togglePropertyPackage(selectedPropertyId, pkgId, !currentActive);
        await fetchPackages(selectedPropertyId);
        setToggling(null);
    };

    const selectedProperty = properties.find(p => p.id === selectedPropertyId);

    return (
        <div className="space-y-8">
            {/* Property Selector */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Property:</label>
                    <select
                        value={selectedPropertyId}
                        onChange={(e) => setSelectedPropertyId(e.target.value)}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:border-zinc-300 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                        {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                {selectedProperty && (
                    <p className="text-sm text-zinc-500">
                        Managing packages for <span className="font-medium text-zinc-700 dark:text-zinc-300">{selectedProperty.name}</span>
                    </p>
                )}
            </div>

            {/* Package Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
                </div>
            ) : packages.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <svg className="h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <p className="text-zinc-500">No packages available yet.</p>
                    <p className="mt-1 text-sm text-zinc-400">Contact your administrator to create packages.</p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {packages.map((pkg) => {
                        const isActive = pkg.subscription?.active ?? false;
                        const isToggling = toggling === pkg.id;

                        return (
                            <div
                                key={pkg.id}
                                className={`relative overflow-hidden rounded-xl border-2 transition-all duration-200 ${isActive
                                        ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-white shadow-lg shadow-purple-500/10 dark:from-purple-950/20 dark:to-zinc-900'
                                        : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute right-0 top-0">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-bl-lg bg-purple-500 text-white">
                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    </div>
                                )}

                                <div className="p-6">
                                    <div className="mb-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pkg.trigger_type === 'booking_end'
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                : pkg.trigger_type === 'daily'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                                    : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                                            }`}>
                                            {pkg.trigger_type === 'booking_end' ? '🔄 After Checkout' :
                                                pkg.trigger_type === 'daily' ? '📅 Daily' :
                                                    pkg.trigger_type === 'weekly' ? '📆 Weekly' : '✋ Manual'}
                                        </span>
                                    </div>

                                    <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                        {pkg.name}
                                    </h3>
                                    <p className="mb-4 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                                        {pkg.description || "No description provided"}
                                    </p>

                                    {pkg.package_items && pkg.package_items.length > 0 && (
                                        <div className="mb-4 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                                                Includes {pkg.package_items.length} item{pkg.package_items.length > 1 ? 's' : ''}
                                            </p>
                                            <ul className="space-y-1">
                                                {pkg.package_items.slice(0, 3).map((pi) => (
                                                    <li key={pi.id} className="flex items-center justify-between text-sm">
                                                        <span className="text-zinc-600 dark:text-zinc-300">{pi.item?.name || 'Item'}</span>
                                                        <span className="font-medium text-zinc-900 dark:text-zinc-100">×{pi.quantity}</span>
                                                    </li>
                                                ))}
                                                {pkg.package_items.length > 3 && (
                                                    <li className="text-xs italic text-zinc-400">+{pkg.package_items.length - 3} more</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => handleToggle(pkg.id, isActive)}
                                        disabled={isToggling}
                                        className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${isActive
                                                ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                                                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                                            } disabled:opacity-50`}
                                    >
                                        {isToggling ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                                Updating...
                                            </span>
                                        ) : isActive ? (
                                            'Disable Package'
                                        ) : (
                                            'Enable Package'
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

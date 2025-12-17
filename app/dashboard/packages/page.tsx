import { listProperties } from "@/app/actions/properties";
import ManagerPackageView from "./ManagerPackageView";

export const dynamic = 'force-dynamic';

export default async function ManagerPackagesPage() {
    const { data: properties, error } = await listProperties();

    if (error) {
        return (
            <div className="container mx-auto max-w-7xl px-4 py-8">
                <p className="text-red-500">Error loading properties: {error}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-7xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                    Package Subscriptions
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Enable automated delivery packages for your properties
                </p>
            </div>

            {properties.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-zinc-500">No properties found. Create a property first.</p>
                </div>
            ) : (
                <ManagerPackageView properties={properties} />
            )}
        </div>
    );
}

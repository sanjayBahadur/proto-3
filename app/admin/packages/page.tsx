import { listPackages } from "@/app/actions/packages";
import { listWarehouseItems } from "@/app/actions/warehouse";
import PackageList from "./PackageList";

export const dynamic = 'force-dynamic';

export default async function AdminPackagesPage() {
    const [packages, items] = await Promise.all([
        listPackages(),
        listWarehouseItems()
    ]);

    return (
        <div className="container mx-auto max-w-7xl py-8">
            <PackageList packages={packages} warehouseItems={items} />
        </div>
    );
}

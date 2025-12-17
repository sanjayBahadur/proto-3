import { listWarehouseItems } from "@/app/actions/warehouse";
import WarehouseTable from "./WarehouseTable";

export const dynamic = 'force-dynamic';

export default async function AdminWarehousePage() {
    const items = await listWarehouseItems();

    return (
        <div className="container mx-auto max-w-7xl py-8">
            <WarehouseTable items={items} />
        </div>
    );
}

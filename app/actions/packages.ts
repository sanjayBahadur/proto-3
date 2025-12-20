"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { WarehouseItem } from "./warehouse";

export interface Package {
    id: string;
    name: string;
    description: string | null;
    trigger_type: 'booking_end' | 'daily' | 'weekly' | 'manual';
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    items?: PackageItem[];
    package_items?: PackageItem[];
}

export interface PackageItem {
    id: string;
    package_id: string;
    item_id: string;
    quantity: number;
    item?: WarehouseItem;
}

export async function listPackages() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("packages")
        .select(`
      *,
      package_items (
        id, quantity, item_id,
        item:warehouse_items (*)
      )
    `)
        .is("deleted_at", null)
        .order("name");

    if (error) {
        console.error("Error listing packages:", error);
        return [];
    }
    return data as Package[];
}

export async function createPackage(
    name: string,
    description: string,
    triggerType: string,
    items: { item_id: string; quantity: number }[]
) {
    const supabase = await createClient();

    // 1. Create Package
    const { data: pkg, error: pkgError } = await supabase
        .from("packages")
        .insert([{ name, description, trigger_type: triggerType }])
        .select()
        .single();

    if (pkgError) return { error: pkgError.message };

    // 2. Add Items
    if (items.length > 0) {
        const { error: itemsError } = await supabase
            .from("package_items")
            .insert(items.map(i => ({ package_id: pkg.id, item_id: i.item_id, quantity: i.quantity })));

        if (itemsError) return { error: "Package created but failed to add items: " + itemsError.message };
    }

    revalidatePath("/admin/packages");
    return { data: pkg };
}

export async function deletePackage(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("packages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/packages");
    return { success: true };
}

// Subscription Actions

export async function listPropertyPackages(propertyId: string) {
    const supabase = await createClient();
    // Get all active packages and check if this property has them enabled
    // Actually, we probably want to list ALL available packages and show status
    const { data: allPackages, error: pkgError } = await supabase
        .from("packages")
        .select("*")
        .is("deleted_at", null);

    if (pkgError) return { error: pkgError.message };

    const { data: subs, error: subError } = await supabase
        .from("property_packages")
        .select("*")
        .eq("property_id", propertyId);

    if (subError) return { error: subError.message };

    // Merge
    return allPackages.map(pkg => ({
        ...pkg,
        subscription: subs.find(s => s.package_id === pkg.id) || null
    }));
}

export async function togglePropertyPackage(propertyId: string, packageId: string, active: boolean) {
    const supabase = await createClient();

    // Upsert
    const { error } = await supabase
        .from("property_packages")
        .upsert(
            { property_id: propertyId, package_id: packageId, active },
            { onConflict: 'property_id, package_id' }
        );

    if (error) return { error: error.message };
    revalidatePath("/dashboard/packages"); // Assuming manager view
    return { success: true };
}

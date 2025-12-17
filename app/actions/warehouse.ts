"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface WarehouseItem {
    id: string;
    name: string;
    sku: string | null;
    description: string | null;
    total_stock: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export type CreateWarehouseItemData = Pick<WarehouseItem, "name" | "sku" | "description" | "total_stock">;
export type UpdateWarehouseItemData = Partial<CreateWarehouseItemData>;

export async function listWarehouseItems() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("warehouse_items")
        .select("*")
        .is("deleted_at", null)
        .order("name");

    if (error) {
        console.error("Error listing warehouse items:", error);
        return [];
    }

    return data as WarehouseItem[];
}

export async function createWarehouseItem(item: CreateWarehouseItemData) {
    const supabase = await createClient();
    const { user } = (await supabase.auth.getUser()).data;
    if (!user) return { error: "Not authenticated" };

    const { data, error } = await supabase
        .from("warehouse_items")
        .insert([{ ...item }])
        .select()
        .single();

    if (error) return { error: error.message };
    revalidatePath("/admin/warehouse");
    return { data };
}

export async function updateWarehouseItem(id: string, updates: UpdateWarehouseItemData) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("warehouse_items")
        .update(updates)
        .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/warehouse");
    return { success: true };
}

export async function deleteWarehouseItem(id: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("warehouse_items")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

    if (error) return { error: error.message };
    revalidatePath("/admin/warehouse");
    return { success: true };
}

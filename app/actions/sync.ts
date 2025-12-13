"use server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * Sync bookings for a property (stub - not implemented yet)
 */
export async function syncPropertyBookings(
  propertyId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("syncPropertyBookings", { propertyId });
    return { success: false, message: "Unauthorized" };
  }

  // Verify property ownership
  const { data: property, error } = await supabase
    .from("properties")
    .select("id, name")
    .eq("id", propertyId)
    .eq("owner_id", user.id)
    .single();

  if (error || !property) {
    logger.warn("Sync failed - property not found or access denied", {
      userId: user.id,
      propertyId,
    });
    return { success: false, message: "Property not found" };
  }

  // Stub implementation
  logger.info("Sync requested (stub)", { userId: user.id, propertyId, propertyName: property.name });
  return { success: true, message: "Sync not implemented yet." };
}

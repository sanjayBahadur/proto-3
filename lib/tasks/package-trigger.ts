import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface PackageTaskSummary {
    propertyId: string;
    triggeredPackages: number;
    tasksCreated: number;
    errors: string[];
}

/**
 * Generate tasks for active packages on a property based on a trigger type.
 * e.g. When a booking ends, check for 'booking_end' packages and create tasks.
 */
export async function generatePackageTasks(
    propertyId: string,
    triggerType: 'booking_end' | 'daily' | 'weekly' | 'manual',
    context?: { bookingId?: string }
): Promise<PackageTaskSummary> {
    const summary: PackageTaskSummary = {
        propertyId,
        triggeredPackages: 0,
        tasksCreated: 0,
        errors: [],
    };

    const supabase = await createClient();

    try {
        // 1. Fetch active property packages matching the trigger
        const { data: subs, error: subError } = await supabase
            .from("property_packages")
            .select(`
        package_id,
        package:packages (
          id, name, description, trigger_type,
          package_items (
            quantity,
            item:warehouse_items (name)
          )
        )
      `)
            .eq("property_id", propertyId)
            .eq("active", true)
            .eq("package.trigger_type", triggerType) // Note: This filter might need client-side if nested filtering is limited
            .is("package.deleted_at", null);

        if (subError) {
            summary.errors.push(`Failed to fetch subscriptions: ${subError.message}`);
            return summary;
        }

        // Filter manually if nested filter didn't work as expected (Safe)
        const matchingSubs = subs?.filter(s => s.package && s.package.trigger_type === triggerType) || [];
        summary.triggeredPackages = matchingSubs.length;

        if (matchingSubs.length === 0) return summary;

        // 2. Create Tasks
        for (const sub of matchingSubs) {
            const pkg: any = sub.package;

            if (!pkg) continue;

            // Idempotency Check: If triggered by booking, check if task already exists
            if (triggerType === 'booking_end' && context?.bookingId) {
                const { data: existing } = await supabase
                    .from("tasks")
                    .select("id")
                    .eq("created_from_booking_id", context.bookingId)
                    .eq("title", `Deliver Package: ${pkg.name}`) // Check specifically for this package
                    .single();

                if (existing) {
                    continue; // Skip if already created
                }
            }

            // Format Items List
            const itemsList = pkg.package_items
                ?.map((pi: any) => `- ${pi.quantity}x ${pi.item?.name || 'Unknown Item'}`)
                .join("\n") || "No items defined.";

            const description = `${pkg.description || 'Package Delivery'}\n\nItems:\n${itemsList}`;

            const { error: taskError } = await supabase
                .from("tasks")
                .insert([{
                    property_id: propertyId,
                    type: 'delivery',
                    title: `Deliver Package: ${pkg.name}`,
                    description: description,
                    due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Due in 2 hours
                    status: 'open',
                    created_from_booking_id: context?.bookingId || null
                }]);

            if (taskError) {
                summary.errors.push(`Failed to create task for package ${pkg.name}: ${taskError.message}`);
                logger.error("Package task creation failed", { error: taskError, propertyId, packageId: pkg.id });
            } else {
                summary.tasksCreated++;
            }
        }

    } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        summary.errors.push(msg);
        logger.error("generatePackageTasks exception", { error, propertyId });
    }

    return summary;
}

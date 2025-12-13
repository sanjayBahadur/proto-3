"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

// =============================================================================
// TYPES
// =============================================================================

export type TaskType = "cleaning" | "restock" | "maintenance";
export type TaskStatus = "open" | "assigned" | "in_progress" | "done" | "verified";

export interface Task {
  id: string;
  property_id: string;
  type: TaskType;
  due_at: string;
  status: TaskStatus;
  assigned_to: string | null;
  created_from_booking_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  actor_id: string;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  note: string | null;
  created_at: string;
}

export interface CreateTaskInput {
  property_id: string;
  type: TaskType;
  due_at: string;
  status?: TaskStatus;
  assigned_to?: string;
  created_from_booking_id?: string;
}

export interface UpdateTaskInput {
  type?: TaskType;
  due_at?: string;
  status?: TaskStatus;
  assigned_to?: string | null;
}

// =============================================================================
// TASK CRUD
// =============================================================================

/**
 * Create a new task (managers only)
 */
export async function createTask(
  input: CreateTaskInput
): Promise<{ data: Task | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("createTask", { propertyId: input.property_id });
    return { data: null, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      property_id: input.property_id,
      type: input.type,
      due_at: input.due_at,
      status: input.status || "open",
      assigned_to: input.assigned_to || null,
      created_from_booking_id: input.created_from_booking_id || null,
    })
    .select()
    .single();

  if (error) {
    logger.apiError("createTask", error, { userId: user.id, input });
    return { data: null, error: error.message };
  }

  // Create initial task event
  await supabase.from("task_events").insert({
    task_id: data.id,
    actor_id: user.id,
    from_status: null,
    to_status: input.status || "open",
    note: "Task created",
  });

  revalidatePath("/dashboard");
  return { data: data as Task, error: null };
}

/**
 * List tasks for a property (managers) or assigned tasks (staff)
 */
export async function listTasks(
  propertyId?: string,
  options?: { status?: TaskStatus; assignedTo?: string; limit?: number }
): Promise<{ data: Task[]; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("listTasks", { propertyId });
    return { data: [], error: "Unauthorized" };
  }

  let query = supabase
    .from("tasks")
    .select("*")
    .order("due_at", { ascending: true });

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.assignedTo) {
    query = query.eq("assigned_to", options.assignedTo);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    logger.apiError("listTasks", error, { userId: user.id, propertyId });
    return { data: [], error: error.message };
  }

  return { data: data as Task[], error: null };
}

/**
 * Get tasks assigned to the current user (for staff)
 */
export async function getMyTasks(
  options?: { status?: TaskStatus; limit?: number }
): Promise<{ data: Task[]; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("getMyTasks", {});
    return { data: [], error: "Unauthorized" };
  }

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", user.id)
    .order("due_at", { ascending: true });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    logger.apiError("getMyTasks", error, { userId: user.id });
    return { data: [], error: error.message };
  }

  return { data: data as Task[], error: null };
}

/**
 * Get a task by ID
 */
export async function getTask(
  id: string
): Promise<{ data: Task | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("getTask", { taskId: id });
    return { data: null, error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: "Task not found" };
    }
    logger.apiError("getTask", error, { userId: user.id, taskId: id });
    return { data: null, error: error.message };
  }

  return { data: data as Task, error: null };
}

/**
 * Update a task (managers can update all fields, staff can only update status)
 */
export async function updateTask(
  id: string,
  input: UpdateTaskInput,
  note?: string
): Promise<{ data: Task | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("updateTask", { taskId: id });
    return { data: null, error: "Unauthorized" };
  }

  // Get current task state for event logging
  const { data: currentTask } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("tasks")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.apiError("updateTask", error, { userId: user.id, taskId: id, input });
    return { data: null, error: error.message };
  }

  // Log status change event
  if (input.status && currentTask && input.status !== currentTask.status) {
    await supabase.from("task_events").insert({
      task_id: id,
      actor_id: user.id,
      from_status: currentTask.status,
      to_status: input.status,
      note: note || null,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/staff");
  return { data: data as Task, error: null };
}

/**
 * Update task status (convenience function for staff)
 */
export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  note?: string
): Promise<{ data: Task | null; error: string | null }> {
  return updateTask(id, { status }, note);
}

/**
 * Delete a task (managers only)
 */
export async function deleteTask(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("deleteTask", { taskId: id });
    return { success: false, error: "Unauthorized" };
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    logger.apiError("deleteTask", error, { userId: user.id, taskId: id });
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, error: null };
}

// =============================================================================
// TASK EVENTS
// =============================================================================

/**
 * Get events for a task
 */
export async function getTaskEvents(
  taskId: string
): Promise<{ data: TaskEvent[]; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("getTaskEvents", { taskId });
    return { data: [], error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("task_events")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.apiError("getTaskEvents", error, { userId: user.id, taskId });
    return { data: [], error: error.message };
  }

  return { data: data as TaskEvent[], error: null };
}

/**
 * Get next cleaning task for a property (for side panel display)
 */
export async function getNextCleaningTask(
  propertyId: string
): Promise<{ data: { due_at: string; status: TaskStatus } | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "Unauthorized" };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("tasks")
    .select("due_at, status")
    .eq("property_id", propertyId)
    .eq("type", "cleaning")
    .in("status", ["open", "assigned", "in_progress"])
    .gte("due_at", now)
    .order("due_at", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: null };
    }
    return { data: null, error: error.message };
  }

  return { data, error: null };
}


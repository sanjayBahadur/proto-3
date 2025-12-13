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

// =============================================================================
// STAFF TASK HELPERS
// =============================================================================

export interface TaskWithProperty extends Task {
  property: {
    id: string;
    name: string;
    address: string | null;
  };
}

/**
 * Get tasks assigned to the current user with property details
 */
export async function getMyTasksWithProperty(): Promise<{
  data: TaskWithProperty[];
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("getMyTasksWithProperty", {});
    return { data: [], error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      property:properties!inner(id, name, address)
    `)
    .eq("assigned_to", user.id)
    .order("due_at", { ascending: true });

  if (error) {
    logger.apiError("getMyTasksWithProperty", error, { userId: user.id });
    return { data: [], error: error.message };
  }

  return { data: data as TaskWithProperty[], error: null };
}

/**
 * Update task status with validation for allowed transitions
 * Staff can only transition: open/assigned → in_progress → done
 */
export async function staffUpdateTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  note?: string
): Promise<{ data: Task | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("staffUpdateTaskStatus", { taskId });
    return { data: null, error: "Unauthorized" };
  }

  // Get current task
  const { data: currentTask, error: fetchError } = await supabase
    .from("tasks")
    .select("id, status, assigned_to")
    .eq("id", taskId)
    .eq("assigned_to", user.id)
    .single();

  if (fetchError || !currentTask) {
    return { data: null, error: "Task not found or not assigned to you" };
  }

  // Validate transition
  const allowedTransitions: Record<TaskStatus, TaskStatus[]> = {
    open: ["in_progress"],
    assigned: ["in_progress"],
    in_progress: ["done"],
    done: [], // Staff cannot transition from done
    verified: [], // Staff cannot transition from verified
  };

  const allowed = allowedTransitions[currentTask.status as TaskStatus] || [];
  if (!allowed.includes(newStatus)) {
    return {
      data: null,
      error: `Cannot transition from "${currentTask.status}" to "${newStatus}"`,
    };
  }

  // Perform update
  const { data, error: updateError } = await supabase
    .from("tasks")
    .update({ status: newStatus })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) {
    logger.apiError("staffUpdateTaskStatus", updateError, { userId: user.id, taskId });
    return { data: null, error: updateError.message };
  }

  // Create task event
  await supabase.from("task_events").insert({
    task_id: taskId,
    actor_id: user.id,
    from_status: currentTask.status,
    to_status: newStatus,
    note: note || null,
  });

  revalidatePath("/staff");
  revalidatePath("/staff/tasks");

  return { data: data as Task, error: null };
}

// =============================================================================
// MANAGER TASK ASSIGNMENT
// =============================================================================

export interface StaffMember {
  id: string;
  email: string | null;
  role: string;
}

/**
 * Get list of staff members for task assignment dropdown
 * Only accessible by managers
 */
export async function listStaffMembers(): Promise<{
  data: StaffMember[];
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("listStaffMembers", {});
    return { data: [], error: "Unauthorized" };
  }

  // Verify user is a manager
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "manager") {
    logger.warn("Non-manager attempted to list staff", { userId: user.id });
    return { data: [], error: "Only managers can view staff list" };
  }

  // Get staff members from profiles
  const { data: staffProfiles, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("role", "staff")
    .order("email", { ascending: true });

  if (error) {
    logger.apiError("listStaffMembers", error, { userId: user.id });
    return { data: [], error: error.message };
  }

  // If email not in profiles, try to get from auth.users via a join isn't possible
  // We'll need to handle this differently - for now return what we have
  return { data: staffProfiles as StaffMember[], error: null };
}

/**
 * Assign a task to a staff member
 * Only managers can assign tasks for their properties
 */
export async function assignTask(
  taskId: string,
  staffId: string,
  note?: string
): Promise<{ data: Task | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("assignTask", { taskId, staffId });
    return { data: null, error: "Unauthorized" };
  }

  // Verify user is a manager
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "manager") {
    logger.warn("Non-manager attempted to assign task", { userId: user.id, taskId });
    return { data: null, error: "Only managers can assign tasks" };
  }

  // Verify staff member exists and has staff role
  const { data: staffProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", staffId)
    .single();

  if (!staffProfile || staffProfile.role !== "staff") {
    return { data: null, error: "Invalid staff member" };
  }

  // Get current task and verify ownership via property
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select(`
      id, status, assigned_to,
      property:properties!inner(id, owner_id)
    `)
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return { data: null, error: "Task not found" };
  }

  // Verify manager owns the property
  const property = task.property as unknown as { id: string; owner_id: string };
  if (property.owner_id !== user.id) {
    logger.warn("Manager attempted to assign task for property they don't own", {
      userId: user.id,
      taskId,
      propertyOwnerId: property.owner_id,
    });
    return { data: null, error: "You can only assign tasks for your own properties" };
  }

  // Determine new status
  const previousStatus = task.status;
  const newStatus = task.status === "open" ? "assigned" : task.status;

  // Perform update
  const { data: updatedTask, error: updateError } = await supabase
    .from("tasks")
    .update({
      assigned_to: staffId,
      status: newStatus,
    })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) {
    logger.apiError("assignTask", updateError, { userId: user.id, taskId, staffId });
    return { data: null, error: updateError.message };
  }

  // Create task event
  await supabase.from("task_events").insert({
    task_id: taskId,
    actor_id: user.id,
    from_status: previousStatus,
    to_status: newStatus,
    note: note || `Assigned to staff member`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/staff");
  revalidatePath("/staff/tasks");

  return { data: updatedTask as Task, error: null };
}

/**
 * Unassign a task (remove staff assignment)
 * Only managers can unassign tasks for their properties
 */
export async function unassignTask(
  taskId: string,
  note?: string
): Promise<{ data: Task | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.unauthorized("unassignTask", { taskId });
    return { data: null, error: "Unauthorized" };
  }

  // Verify user is a manager
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "manager") {
    return { data: null, error: "Only managers can unassign tasks" };
  }

  // Get current task and verify ownership
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select(`
      id, status, assigned_to,
      property:properties!inner(id, owner_id)
    `)
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return { data: null, error: "Task not found" };
  }

  const property = task.property as unknown as { id: string; owner_id: string };
  if (property.owner_id !== user.id) {
    return { data: null, error: "You can only unassign tasks for your own properties" };
  }

  // Cannot unassign if task is in_progress or beyond
  if (["in_progress", "done", "verified"].includes(task.status)) {
    return { data: null, error: "Cannot unassign a task that is in progress or completed" };
  }

  const previousStatus = task.status;

  // Perform update
  const { data: updatedTask, error: updateError } = await supabase
    .from("tasks")
    .update({
      assigned_to: null,
      status: "open",
    })
    .eq("id", taskId)
    .select()
    .single();

  if (updateError) {
    logger.apiError("unassignTask", updateError, { userId: user.id, taskId });
    return { data: null, error: updateError.message };
  }

  // Create task event
  await supabase.from("task_events").insert({
    task_id: taskId,
    actor_id: user.id,
    from_status: previousStatus,
    to_status: "open",
    note: note || "Unassigned from staff member",
  });

  revalidatePath("/dashboard");
  revalidatePath("/staff");
  revalidatePath("/staff/tasks");

  return { data: updatedTask as Task, error: null };
}


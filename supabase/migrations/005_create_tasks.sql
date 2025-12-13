-- Migration: Create tasks and task_events tables
-- Description: Task management system for properties with status tracking

-- =============================================================================
-- TASKS TABLE
-- =============================================================================

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('cleaning', 'restock', 'maintenance')),
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'done', 'verified')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_from_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX tasks_property_id_idx ON public.tasks(property_id);
CREATE INDEX tasks_assigned_to_idx ON public.tasks(assigned_to);
CREATE INDEX tasks_status_idx ON public.tasks(status);
CREATE INDEX tasks_due_at_idx ON public.tasks(due_at);
CREATE INDEX tasks_property_status_idx ON public.tasks(property_id, status);
CREATE INDEX tasks_assigned_status_idx ON public.tasks(assigned_to, status);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- TASK_EVENTS TABLE (audit log for status changes)
-- =============================================================================

CREATE TABLE public.task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_status TEXT CHECK (from_status IS NULL OR from_status IN ('open', 'assigned', 'in_progress', 'done', 'verified')),
  to_status TEXT NOT NULL CHECK (to_status IN ('open', 'assigned', 'in_progress', 'done', 'verified')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX task_events_task_id_idx ON public.task_events(task_id);
CREATE INDEX task_events_actor_id_idx ON public.task_events(actor_id);
CREATE INDEX task_events_created_at_idx ON public.task_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES FOR TASKS
-- =============================================================================

-- Managers can view all tasks for their properties
CREATE POLICY "Managers can view tasks for their properties"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Staff can view tasks assigned to them
CREATE POLICY "Staff can view tasks assigned to them"
  ON public.tasks FOR SELECT
  USING (assigned_to = auth.uid());

-- Managers can create tasks for their properties
CREATE POLICY "Managers can create tasks for their properties"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Managers can update any task for their properties
CREATE POLICY "Managers can update tasks for their properties"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Staff can update status only for tasks assigned to them
-- Note: This allows updating only status field; application layer enforces field restrictions
CREATE POLICY "Staff can update their assigned tasks"
  ON public.tasks FOR UPDATE
  USING (assigned_to = auth.uid());

-- Managers can delete tasks for their properties
CREATE POLICY "Managers can delete tasks for their properties"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- =============================================================================
-- RLS POLICIES FOR TASK_EVENTS
-- =============================================================================

-- Managers can view all events for tasks on their properties
CREATE POLICY "Managers can view task events for their properties"
  ON public.task_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.properties p ON t.property_id = p.id
      WHERE t.id = task_id AND p.owner_id = auth.uid()
    )
  );

-- Staff can view events for tasks assigned to them
CREATE POLICY "Staff can view events for their assigned tasks"
  ON public.task_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_id AND assigned_to = auth.uid()
    )
  );

-- Managers can create events for tasks on their properties
CREATE POLICY "Managers can create task events for their properties"
  ON public.task_events FOR INSERT
  WITH CHECK (
    actor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.properties p ON t.property_id = p.id
      WHERE t.id = task_id AND p.owner_id = auth.uid()
    )
  );

-- Staff can create events for tasks assigned to them
CREATE POLICY "Staff can create events for their assigned tasks"
  ON public.task_events FOR INSERT
  WITH CHECK (
    actor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = task_id AND assigned_to = auth.uid()
    )
  );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Create or replace the updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at on tasks modification
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
GRANT ALL ON public.task_events TO authenticated;
GRANT ALL ON public.task_events TO service_role;


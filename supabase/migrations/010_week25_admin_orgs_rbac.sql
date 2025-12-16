-- =============================================================================
-- WEEK 2.5 MIGRATION: Admin Role, Organizations, and RBAC
-- =============================================================================
-- This single migration adds:
-- 1. Organizations table for multi-tenant support
-- 2. Admin role to profiles
-- 3. org_id foreign key to profiles and properties
-- 4. disabled column for soft-disabling accounts
-- 5. Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- 6. Updated RLS policies for all tables
--
-- Run this AFTER migrations 001-009
-- =============================================================================

-- =============================================================================
-- PART 1: ORGANIZATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS organizations_name_idx ON public.organizations(name);
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

-- =============================================================================
-- PART 2: UPDATE PROFILES TABLE
-- =============================================================================

-- Drop existing role check constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add admin to the role check constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'manager', 'staff'));

-- Add disabled column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;

-- Add org_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_org_id_idx ON public.profiles(org_id);
CREATE INDEX IF NOT EXISTS profiles_disabled_idx ON public.profiles(disabled);

-- =============================================================================
-- PART 3: UPDATE PROPERTIES TABLE
-- =============================================================================

ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS properties_org_id_idx ON public.properties(org_id);

-- =============================================================================
-- PART 4: HELPER FUNCTIONS (SECURITY DEFINER - bypass RLS)
-- =============================================================================

-- Get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND disabled = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- Get current user's org_id (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid() AND disabled = false;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_org_id() TO authenticated;

-- Check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin' 
    AND disabled = false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Check if current user is manager or admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager') 
    AND disabled = false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_manager_or_admin() TO authenticated;

-- =============================================================================
-- PART 5: DROP ALL EXISTING RLS POLICIES
-- =============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view staff profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Manager/Admin can view org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view org members" ON public.profiles;
DROP POLICY IF EXISTS "Users can view same org profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Properties
DROP POLICY IF EXISTS "Users can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Managers can view own properties" ON public.properties;
DROP POLICY IF EXISTS "Staff can view org properties" ON public.properties;
DROP POLICY IF EXISTS "Managers can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Managers can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can update any property" ON public.properties;
DROP POLICY IF EXISTS "Managers can delete own properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can delete any property" ON public.properties;

-- Tasks
DROP POLICY IF EXISTS "Managers can view tasks for their properties" ON public.tasks;
DROP POLICY IF EXISTS "Staff can view tasks assigned to them" ON public.tasks;
DROP POLICY IF EXISTS "Managers can create tasks for their properties" ON public.tasks;
DROP POLICY IF EXISTS "Managers can update tasks for their properties" ON public.tasks;
DROP POLICY IF EXISTS "Staff can update their assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Managers can delete tasks for their properties" ON public.tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff can view org tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can update any task" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete any task" ON public.tasks;

-- Task events
DROP POLICY IF EXISTS "Managers can view task events for their properties" ON public.task_events;
DROP POLICY IF EXISTS "Staff can view events for their assigned tasks" ON public.task_events;
DROP POLICY IF EXISTS "Managers can create task events for their properties" ON public.task_events;
DROP POLICY IF EXISTS "Staff can create events for their assigned tasks" ON public.task_events;
DROP POLICY IF EXISTS "Admins can view all task events" ON public.task_events;
DROP POLICY IF EXISTS "Admins can create task events" ON public.task_events;

-- Bookings
DROP POLICY IF EXISTS "Users can view bookings for own properties" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert bookings for own properties" ON public.bookings;
DROP POLICY IF EXISTS "Users can update bookings for own properties" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete bookings for own properties" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Managers can view bookings for own properties" ON public.bookings;
DROP POLICY IF EXISTS "Staff can view org property bookings" ON public.bookings;
DROP POLICY IF EXISTS "Managers can insert bookings for own properties" ON public.bookings;
DROP POLICY IF EXISTS "Admins can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Managers can update bookings for own properties" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update any booking" ON public.bookings;
DROP POLICY IF EXISTS "Managers can delete bookings for own properties" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete any booking" ON public.bookings;

-- Organizations
DROP POLICY IF EXISTS "Admins can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can view own organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON public.organizations;

-- =============================================================================
-- PART 6: ORGANIZATIONS RLS POLICIES
-- =============================================================================

CREATE POLICY "Admins can view all organizations"
  ON public.organizations FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can view own organization"
  ON public.organizations FOR SELECT
  USING (id = public.get_current_user_org_id());

CREATE POLICY "Admins can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete organizations"
  ON public.organizations FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- PART 7: PROFILES RLS POLICIES (recursion-safe)
-- =============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Users can view profiles in same org
CREATE POLICY "Users can view same org profiles"
  ON public.profiles FOR SELECT
  USING (
    org_id IS NOT NULL 
    AND org_id = public.get_current_user_org_id()
  );

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- =============================================================================
-- PART 8: PROPERTIES RLS POLICIES
-- =============================================================================

-- Admins can view all properties
CREATE POLICY "Admins can view all properties"
  ON public.properties FOR SELECT
  USING (public.is_admin());

-- Managers can view their own properties
CREATE POLICY "Managers can view own properties"
  ON public.properties FOR SELECT
  USING (
    public.get_current_user_role() = 'manager'
    AND owner_id = auth.uid()
  );

-- Staff can view properties in their org
CREATE POLICY "Staff can view org properties"
  ON public.properties FOR SELECT
  USING (
    public.get_current_user_role() = 'staff'
    AND org_id = public.get_current_user_org_id()
  );

-- Managers can insert properties
CREATE POLICY "Managers can insert properties"
  ON public.properties FOR INSERT
  WITH CHECK (
    public.get_current_user_role() = 'manager'
    AND owner_id = auth.uid()
  );

-- Admins can insert properties
CREATE POLICY "Admins can insert properties"
  ON public.properties FOR INSERT
  WITH CHECK (public.is_admin());

-- Managers can update their own properties
CREATE POLICY "Managers can update own properties"
  ON public.properties FOR UPDATE
  USING (
    public.get_current_user_role() = 'manager'
    AND owner_id = auth.uid()
  );

-- Admins can update any property
CREATE POLICY "Admins can update any property"
  ON public.properties FOR UPDATE
  USING (public.is_admin());

-- Managers can delete their own properties
CREATE POLICY "Managers can delete own properties"
  ON public.properties FOR DELETE
  USING (
    public.get_current_user_role() = 'manager'
    AND owner_id = auth.uid()
  );

-- Admins can delete any property
CREATE POLICY "Admins can delete any property"
  ON public.properties FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- PART 9: TASKS RLS POLICIES
-- =============================================================================

-- Admins can view all tasks
CREATE POLICY "Admins can view all tasks"
  ON public.tasks FOR SELECT
  USING (public.is_admin());

-- Managers can view tasks for their properties
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

-- Staff can view tasks for properties in their org
CREATE POLICY "Staff can view org tasks"
  ON public.tasks FOR SELECT
  USING (
    public.get_current_user_role() = 'staff'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id 
      AND p.org_id = public.get_current_user_org_id()
    )
  );

-- Managers can create tasks for their properties
CREATE POLICY "Managers can create tasks for their properties"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Admins can create tasks
CREATE POLICY "Admins can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_admin());

-- Managers can update tasks for their properties
CREATE POLICY "Managers can update tasks for their properties"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Admins can update any task
CREATE POLICY "Admins can update any task"
  ON public.tasks FOR UPDATE
  USING (public.is_admin());

-- Staff can update tasks assigned to them (status only - enforced in app)
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

-- Admins can delete any task
CREATE POLICY "Admins can delete any task"
  ON public.tasks FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- PART 10: TASK EVENTS RLS POLICIES
-- =============================================================================

-- Admins can view all task events
CREATE POLICY "Admins can view all task events"
  ON public.task_events FOR SELECT
  USING (public.is_admin());

-- Managers can view events for tasks on their properties
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

-- Admins can create task events
CREATE POLICY "Admins can create task events"
  ON public.task_events FOR INSERT
  WITH CHECK (actor_id = auth.uid() AND public.is_admin());

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
-- PART 11: BOOKINGS RLS POLICIES
-- =============================================================================

-- Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  USING (public.is_admin());

-- Managers can view bookings for their properties
CREATE POLICY "Managers can view bookings for own properties"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bookings.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Staff can view bookings for properties in their org
CREATE POLICY "Staff can view org property bookings"
  ON public.bookings FOR SELECT
  USING (
    public.get_current_user_role() = 'staff'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id 
      AND p.org_id = public.get_current_user_org_id()
    )
  );

-- Managers can insert bookings for their properties
CREATE POLICY "Managers can insert bookings for own properties"
  ON public.bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bookings.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Admins can insert bookings
CREATE POLICY "Admins can insert bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (public.is_admin());

-- Managers can update bookings for their properties
CREATE POLICY "Managers can update bookings for own properties"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bookings.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Admins can update any booking
CREATE POLICY "Admins can update any booking"
  ON public.bookings FOR UPDATE
  USING (public.is_admin());

-- Managers can delete bookings for their properties
CREATE POLICY "Managers can delete bookings for own properties"
  ON public.bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bookings.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Admins can delete any booking
CREATE POLICY "Admins can delete any booking"
  ON public.bookings FOR DELETE
  USING (public.is_admin());

-- =============================================================================
-- PART 12: SEED DEFAULT ORGANIZATION
-- =============================================================================

INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization')
ON CONFLICT (id) DO NOTHING;

-- Assign existing profiles to default org
UPDATE public.profiles 
SET org_id = '00000000-0000-0000-0000-000000000001' 
WHERE org_id IS NULL;

-- Assign existing properties to default org
UPDATE public.properties 
SET org_id = '00000000-0000-0000-0000-000000000001' 
WHERE org_id IS NULL;

-- =============================================================================
-- PART 13: COMMENTS
-- =============================================================================

COMMENT ON TABLE public.organizations IS 'Organizations for multi-tenant access control';
COMMENT ON COLUMN public.profiles.disabled IS 'Soft-disable flag to prevent user access';
COMMENT ON COLUMN public.profiles.org_id IS 'Organization the user belongs to';
COMMENT ON COLUMN public.properties.org_id IS 'Organization the property belongs to';

-- =============================================================================
-- HOW TO CREATE FIRST ADMIN
-- =============================================================================
-- 1. Create a user via Supabase Auth dashboard
-- 2. Run: UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
-- =============================================================================

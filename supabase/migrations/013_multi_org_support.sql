-- =============================================================================
-- WEEK 3 MIGRATION: Multi-Organization Support & Admin User Management
-- =============================================================================

-- =============================================================================
-- PART 1: ORGANIZATION MEMBERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS org_members_user_idx ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS org_members_org_idx ON public.organization_members(org_id);

GRANT ALL ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;

-- =============================================================================
-- PART 2: DATA MIGRATION & SYNC TRIGGER
-- =============================================================================

-- 1. Migrate existing profiles.org_id to organization_members
INSERT INTO public.organization_members (user_id, org_id)
SELECT id, org_id FROM public.profiles 
WHERE org_id IS NOT NULL
ON CONFLICT (user_id, org_id) DO NOTHING;

-- 2. Trigger to keep organization_members in sync with profiles.org_id (for legacy compatibility/primary org)
--    When profiles.org_id is updated (e.g. for Manager), ensure entry exists in members.
CREATE OR REPLACE FUNCTION public.sync_profile_org_to_members()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.org_id IS NOT NULL THEN
    INSERT INTO public.organization_members (user_id, org_id)
    VALUES (NEW.id, NEW.org_id)
    ON CONFLICT (user_id, org_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_profile_org
AFTER INSERT OR UPDATE OF org_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_org_to_members();

-- =============================================================================
-- PART 3: HELPER FUNCTIONS (UPDATED)
-- =============================================================================

-- Get current user's org IDs (Array) - used for Staff RLS
CREATE OR REPLACE FUNCTION public.get_current_user_org_ids()
RETURNS UUID[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ARRAY_AGG(org_id) 
  FROM public.organization_members 
  WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_org_ids() TO authenticated;

-- =============================================================================
-- PART 4: UPDATE RLS POLICIES (MULTI-ORG AWARE)
-- =============================================================================

-- 4.1 Properties
DROP POLICY IF EXISTS "Staff can view org properties" ON public.properties;
CREATE POLICY "Staff can view org properties"
  ON public.properties FOR SELECT
  USING (
    public.get_current_user_role() = 'staff'
    AND org_id = ANY(public.get_current_user_org_ids())
  );

-- 4.2 Tasks
DROP POLICY IF EXISTS "Staff can view org tasks" ON public.tasks;
CREATE POLICY "Staff can view org tasks"
  ON public.tasks FOR SELECT
  USING (
    public.get_current_user_role() = 'staff'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id 
      AND p.org_id = ANY(public.get_current_user_org_ids())
    )
  );

-- 4.3 Bookings
DROP POLICY IF EXISTS "Staff can view org property bookings" ON public.bookings;
CREATE POLICY "Staff can view org property bookings"
  ON public.bookings FOR SELECT
  USING (
    public.get_current_user_role() = 'staff'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_id 
      AND p.org_id = ANY(public.get_current_user_org_ids())
    )
  );

-- 4.4 Profiles (Users can view same org profiles)
DROP POLICY IF EXISTS "Users can view same org profiles" ON public.profiles;
CREATE POLICY "Users can view same org profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om_me
        JOIN public.organization_members om_other ON om_me.org_id = om_other.org_id
        WHERE om_me.user_id = auth.uid()
        AND om_other.user_id = profiles.id
    )
  );

-- 4.5 Organization Members RLS
-- Admins can view all
CREATE POLICY "Admins can view all org members"
  ON public.organization_members FOR SELECT
  USING (public.is_admin());

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
  ON public.organization_members FOR SELECT
  USING (user_id = auth.uid());
  
-- Admins can insert/update/delete memberships
CREATE POLICY "Admins can manage org members"
  ON public.organization_members FOR ALL
  USING (public.is_admin());


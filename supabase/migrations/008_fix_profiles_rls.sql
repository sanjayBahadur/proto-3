-- Migration: Fix infinite recursion in profiles RLS policy
-- Description: Use a security definer function to check user role

-- First, drop the problematic policy
DROP POLICY IF EXISTS "Managers can view staff profiles" ON public.profiles;

-- Create a security definer function to get current user's role
-- This bypasses RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- Recreate the policy using the function
CREATE POLICY "Managers can view staff profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Current user is a manager AND viewing a staff profile
    (public.get_current_user_role() = 'manager' AND role = 'staff')
    -- OR user is viewing their own profile (existing policy handles this but include for clarity)
    OR id = auth.uid()
  );


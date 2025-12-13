-- Migration: Allow managers to view staff profiles
-- Description: Enables managers to see staff members for task assignment

-- Add email column to profiles for display purposes (nullable for existing rows)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Policy: Managers can view staff profiles (for task assignment dropdown)
CREATE POLICY "Managers can view staff profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- User is a manager
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
    )
    -- And target profile is staff
    AND role = 'staff'
  );

-- Note: This policy works alongside "Users can view own profile"
-- Managers can see: their own profile + all staff profiles
-- Staff can see: only their own profile


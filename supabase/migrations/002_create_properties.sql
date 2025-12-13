-- Create properties table for storing property listings with ownership
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Create the properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS properties_owner_id_idx ON public.properties(owner_id);
CREATE INDEX IF NOT EXISTS properties_location_idx ON public.properties(lat, lng);
CREATE INDEX IF NOT EXISTS properties_created_at_idx ON public.properties(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own properties
CREATE POLICY "Users can view own properties"
  ON public.properties
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Users can insert their own properties
CREATE POLICY "Users can insert own properties"
  ON public.properties
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own properties
CREATE POLICY "Users can update own properties"
  ON public.properties
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Policy: Users can delete their own properties
CREATE POLICY "Users can delete own properties"
  ON public.properties
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Grant permissions
GRANT ALL ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;

-- Optional: Add a comment describing the table
COMMENT ON TABLE public.properties IS 'Stores property listings owned by users';
COMMENT ON COLUMN public.properties.lat IS 'Latitude coordinate of the property';
COMMENT ON COLUMN public.properties.lng IS 'Longitude coordinate of the property';


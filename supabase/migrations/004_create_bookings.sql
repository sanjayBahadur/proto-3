-- Create bookings table for storing calendar events synced from iCal feeds
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'ical',
  external_uid TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  summary TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for idempotent upserts (same external event won't be duplicated)
CREATE UNIQUE INDEX IF NOT EXISTS bookings_property_external_uid_idx 
  ON public.bookings(property_id, external_uid);

-- Index for querying bookings by property
CREATE INDEX IF NOT EXISTS bookings_property_id_idx 
  ON public.bookings(property_id);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS bookings_date_range_idx 
  ON public.bookings(property_id, start_date, end_date);

-- Index for sorting by start date
CREATE INDEX IF NOT EXISTS bookings_start_date_idx 
  ON public.bookings(start_date DESC);

-- Enable Row Level Security
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Managers can only access bookings for properties they own
-- This uses a subquery to check property ownership

CREATE POLICY "Users can view bookings for own properties"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bookings.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert bookings for own properties"
  ON public.bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bookings.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update bookings for own properties"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bookings.property_id
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete bookings for own properties"
  ON public.bookings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = bookings.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on row changes
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.bookings IS 'Calendar bookings synced from iCal feeds, tied to properties';
COMMENT ON COLUMN public.bookings.external_uid IS 'Unique identifier from the external calendar (iCal UID)';
COMMENT ON COLUMN public.bookings.source IS 'Source of the booking: ical, manual, etc.';
COMMENT ON COLUMN public.bookings.raw IS 'Raw event data from the source (JSON format)';


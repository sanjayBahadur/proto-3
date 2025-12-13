-- Add iCal URL column to properties table
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS ical_url TEXT;

-- Add a comment describing the column
COMMENT ON COLUMN public.properties.ical_url IS 'URL to an iCal (.ics) feed for this property';


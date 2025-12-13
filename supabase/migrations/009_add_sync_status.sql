-- Migration: Add sync status tracking to properties
-- Description: Track last sync time and status for iCal feeds

-- Add sync tracking columns
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error', 'pending'));

-- Create index for finding properties that need sync
CREATE INDEX IF NOT EXISTS properties_last_sync_at_idx ON public.properties(last_sync_at);
CREATE INDEX IF NOT EXISTS properties_sync_status_idx ON public.properties(last_sync_status);


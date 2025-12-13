-- Migration: Add health_score column to properties
-- Description: Property health scoring system (0-100)

-- Add health_score column with default 100
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS health_score INTEGER NOT NULL DEFAULT 100
CHECK (health_score >= 0 AND health_score <= 100);

-- Create index for sorting/filtering by health
CREATE INDEX IF NOT EXISTS properties_health_score_idx ON public.properties(health_score);


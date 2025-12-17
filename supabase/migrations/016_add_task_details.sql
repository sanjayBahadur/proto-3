-- Migration: Add title, description to tasks and allow 'delivery' type
-- Description: Enhances tasks table for generic task usage (e.g. package delivery)

-- 1. Add new columns
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Update type check constraint to include 'delivery'
-- We have to drop the old constraint and add a new one.
-- Depending on how it was named, it is usually 'tasks_type_check'.

DO $$
BEGIN
  -- Safe verify before dropping
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tasks_type_check') THEN
      ALTER TABLE public.tasks DROP CONSTRAINT tasks_type_check;
  END IF;

  -- Re-add with new allowed values
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_check 
  CHECK (type IN ('cleaning', 'restock', 'maintenance', 'delivery'));
END $$;

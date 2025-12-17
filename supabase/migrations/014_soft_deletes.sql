-- Migration: Add soft delete support
-- Description: Adds deleted_at column to organizations and properties

-- Organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS organizations_deleted_at_idx ON public.organizations(deleted_at);

-- Properties
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS properties_deleted_at_idx ON public.properties(deleted_at);

-- Comments
COMMENT ON COLUMN public.organizations.deleted_at IS 'Timestamp when the organization was soft-deleted';
COMMENT ON COLUMN public.properties.deleted_at IS 'Timestamp when the property was soft-deleted';

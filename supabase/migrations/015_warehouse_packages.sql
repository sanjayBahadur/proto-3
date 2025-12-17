-- Migration: Warehouse and Packages System
-- Description: Adds tables for warehouse inventory, package definitions, and property subscriptions

-- =============================================================================
-- 1. WAREHOUSE ITEMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.warehouse_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  total_stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- RLS
ALTER TABLE public.warehouse_items ENABLE ROW LEVEL SECURITY;

-- Admins can manage warehouse items
CREATE POLICY "Admins can manage warehouse items"
  ON public.warehouse_items
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Managers/Staff can view items (read-only)
CREATE POLICY "Users can view warehouse items"
  ON public.warehouse_items
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- 2. PACKAGES (Bundles)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('booking_end', 'daily', 'weekly', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- RLS
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- Admins can manage packages
CREATE POLICY "Admins can manage packages"
  ON public.packages
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Managers/Staff can view packages (read-only)
CREATE POLICY "Users can view packages"
  ON public.packages
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- 3. PACKAGE ITEMS (Junction)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.warehouse_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;

-- Admins can manage package items
CREATE POLICY "Admins can manage package items"
  ON public.package_items
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can view package items
CREATE POLICY "Users can view package items"
  ON public.package_items
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- 4. PROPERTY PACKAGES (Subscriptions)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.property_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(property_id, package_id)
);

-- RLS
ALTER TABLE public.property_packages ENABLE ROW LEVEL SECURITY;

-- Admins manage all subscriptions (if needed)
CREATE POLICY "Admins can manage all subscriptions"
  ON public.property_packages
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Managers can manage subscriptions for their properties
CREATE POLICY "Managers can manage own property subscriptions"
  ON public.property_packages
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_packages.property_id
      AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_packages.property_id
      AND owner_id = auth.uid()
    )
  );

-- Staff can view subscriptions for their org properties
CREATE POLICY "Staff can view org subscriptions"
  ON public.property_packages
  FOR SELECT
  USING (
    public.get_current_user_role() = 'staff'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_packages.property_id
      AND p.org_id = public.get_current_user_org_id()
    )
  );

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at for warehouse_items
CREATE TRIGGER update_warehouse_items_updated_at
  BEFORE UPDATE ON public.warehouse_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update updated_at for packages
CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update updated_at for property_packages
CREATE TRIGGER update_property_packages_updated_at
  BEFORE UPDATE ON public.property_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

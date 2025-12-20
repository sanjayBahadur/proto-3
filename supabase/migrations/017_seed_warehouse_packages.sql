-- Migration: Seed Data for Warehouse & Packages
-- Description: Adds sample inventory items and packages for demo/development

-- =============================================================================
-- 1. WAREHOUSE ITEMS (Common vacation rental supplies)
-- =============================================================================

INSERT INTO public.warehouse_items (name, sku, description, total_stock) VALUES
  ('Premium Bath Towels', 'TOW-001', 'High-quality white cotton bath towels, set of 2', 150),
  ('Bed Linens - Queen', 'BED-Q01', 'Egyptian cotton sheet set for queen beds', 80),
  ('Bed Linens - King', 'BED-K01', 'Egyptian cotton sheet set for king beds', 60),
  ('Toiletry Kit', 'TLT-001', 'Shampoo, conditioner, body wash, lotion mini bottles', 200),
  ('Coffee Starter Pack', 'COF-001', 'Ground coffee, filters, sugar, creamer packets', 120),
  ('Welcome Snack Basket', 'SNK-001', 'Assorted local snacks and treats', 50),
  ('Kitchen Essentials', 'KIT-001', 'Dish soap, sponge, paper towels, trash bags', 90),
  ('Cleaning Supplies', 'CLN-001', 'Multi-surface cleaner, glass cleaner, disinfectant', 100)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 2. PACKAGES (Pre-made bundles)
-- =============================================================================

-- Standard Turnover Package
WITH pkg AS (
  INSERT INTO public.packages (name, description, trigger_type)
  VALUES (
    'Standard Turnover Kit',
    'Essential supplies restocked after each guest checkout',
    'booking_end'
  )
  RETURNING id
)
INSERT INTO public.package_items (package_id, item_id, quantity)
SELECT pkg.id, wi.id, 
  CASE wi.sku
    WHEN 'TOW-001' THEN 2
    WHEN 'TLT-001' THEN 1
    WHEN 'COF-001' THEN 1
    WHEN 'KIT-001' THEN 1
    ELSE 1
  END
FROM pkg, public.warehouse_items wi
WHERE wi.sku IN ('TOW-001', 'TLT-001', 'COF-001', 'KIT-001');

-- Premium Welcome Package
WITH pkg AS (
  INSERT INTO public.packages (name, description, trigger_type)
  VALUES (
    'VIP Welcome Package',
    'Premium amenities for high-value guests and special occasions',
    'manual'
  )
  RETURNING id
)
INSERT INTO public.package_items (package_id, item_id, quantity)
SELECT pkg.id, wi.id,
  CASE wi.sku
    WHEN 'TOW-001' THEN 4
    WHEN 'BED-Q01' THEN 1
    WHEN 'TLT-001' THEN 2
    WHEN 'SNK-001' THEN 1
    WHEN 'COF-001' THEN 2
    ELSE 1
  END
FROM pkg, public.warehouse_items wi
WHERE wi.sku IN ('TOW-001', 'BED-Q01', 'TLT-001', 'SNK-001', 'COF-001');

-- Weekly Refresh Package
WITH pkg AS (
  INSERT INTO public.packages (name, description, trigger_type)
  VALUES (
    'Weekly Refresh',
    'Mid-stay refresh for long-term guests',
    'weekly'
  )
  RETURNING id
)
INSERT INTO public.package_items (package_id, item_id, quantity)
SELECT pkg.id, wi.id,
  CASE wi.sku
    WHEN 'TOW-001' THEN 2
    WHEN 'TLT-001' THEN 1
    WHEN 'CLN-001' THEN 1
    ELSE 1
  END
FROM pkg, public.warehouse_items wi
WHERE wi.sku IN ('TOW-001', 'TLT-001', 'CLN-001');

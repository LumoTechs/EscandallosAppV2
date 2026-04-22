-- ============================================
-- GastroCost - Esquema inicial completo
-- Ejecutar este archivo UNA VEZ en Supabase > SQL Editor
-- Seguro para ejecutar incluso si ya tenías tablas previas.
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. PRODUCTS (catálogo maestro de productos)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text,
  current_price numeric(10,4),
  supplier text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier text;

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier);

-- ============================================
-- 2. PRODUCT_PRICES (histórico de precios)
-- ============================================
CREATE TABLE IF NOT EXISTS product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  price numeric(10,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices(product_id, created_at DESC);

-- ============================================
-- 3. INVOICES (cabeceras de factura)
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier text,
  invoice_number text,
  invoice_date date,
  status text DEFAULT 'processed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number text;

CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);

-- ============================================
-- 4. INVOICE_ITEMS (líneas de factura)
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  product_name text,
  quantity numeric(10,4),
  unit text,
  unit_price numeric(10,4),
  total_price numeric(10,2),
  pack_info text,
  cost_per_unit_normalized numeric(10,4),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS pack_info text;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cost_per_unit_normalized numeric(10,4);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- ============================================
-- 5. RECIPES (escandallos)
-- ============================================
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sale_price numeric(10,2),
  target_food_cost_percentage numeric(5,2) DEFAULT 35,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 6. RECIPE_INGREDIENTS
-- ============================================
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity numeric(10,4) NOT NULL,
  unit text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- ============================================
-- 7. ALERTS
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  message text NOT NULL,
  severity text DEFAULT 'medium',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(read, created_at DESC);

-- ============================================
-- 8. Backfill opcional: asociar productos al proveedor de su última factura
-- ============================================
UPDATE products p
SET supplier = sub.supplier
FROM (
  SELECT DISTINCT ON (LOWER(ii.product_name))
    LOWER(ii.product_name) AS pname,
    i.supplier
  FROM invoice_items ii
  JOIN invoices i ON i.id = ii.invoice_id
  WHERE i.supplier IS NOT NULL
  ORDER BY LOWER(ii.product_name), i.invoice_date DESC NULLS LAST
) sub
WHERE LOWER(p.name) = sub.pname
  AND (p.supplier IS NULL OR p.supplier = '');

-- Listo. La app está en modo mono-usuario: las API routes usan la 
-- service_role key que bypassa RLS. No necesitas activar RLS para que funcione.

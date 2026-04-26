-- Columna generada: nombre normalizado (lower + trim) para lookups y UNIQUE.
-- Mantiene la columna `name` con la capitalización original del OCR.
ALTER TABLE products
  ADD COLUMN name_normalized text
  GENERATED ALWAYS AS (lower(trim(name))) STORED;

-- Índice único compuesto: mismo (name normalizado, proveedor) → mismo producto.
-- NULLS NOT DISTINCT: dos filas con supplier=NULL y mismo nombre colisionan.
CREATE UNIQUE INDEX products_name_norm_supplier_uniq
  ON products (name_normalized, supplier) NULLS NOT DISTINCT;

-- Add category column to recipes table (was missing from initial schema)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category TEXT;

-- Añade image_url a recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Bucket público para imágenes de platos (5 MB máx, sólo imágenes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-images',
  'recipe-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

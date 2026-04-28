import { getAdminClient } from '../../_lib/supabase.js';
import { query } from '../../_lib/db.js';
import { requireAuth } from '../../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;
  const { base64Image, mimeType = 'image/jpeg' } = req.body || {};

  if (!id)          return res.status(400).json({ error: 'id requerido' });
  if (!base64Image) return res.status(400).json({ error: 'base64Image requerido' });

  try {
    const supabase = getAdminClient();

    // Crea el bucket si no existe (idempotente)
    await supabase.storage.createBucket('recipe-images', {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const ext  = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const path = `${id}/photo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(path);
    // Forzar cache-bust para que el cliente vea la imagen nueva
    const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await query('UPDATE recipes SET image_url = $1 WHERE id = $2', [urlData.publicUrl, id]);

    return res.status(200).json({ image_url: imageUrl });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);

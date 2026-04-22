// api/alerts/list.js
import { getAdminClient } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const unreadOnly = req.query.unread_only === 'true';
    const supabase = getAdminClient();

    let query = supabase
      .from('alerts')
      .select(`
        id,
        message,
        severity,
        read,
        created_at,
        product_id,
        recipe_id,
        products ( name )
      `)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return res.status(500).json({ error: error.message });
    }

    // Normalizamos al shape que espera el frontend
    const alerts = (data || []).map((a) => ({
      id: a.id,
      message: a.message,
      severity: a.severity,
      is_read: a.read,
      created_at: a.created_at,
      product_id: a.product_id,
      recipe_id: a.recipe_id,
      product_name: a.products?.name || null,
    }));

    return res.status(200).json({ alerts });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

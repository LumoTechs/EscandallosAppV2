// api/products/[id]/history?range=6m|1m|1y|all
// Devuelve histórico de precios + stats {min, max, points} para el chart de evolución.

import { getAdminClient } from '../../_lib/supabase.js';
import { requireAuth } from '../../_lib/auth.js';

const RANGE_DAYS = {
  '1m': 30,
  '6m': 180,
  '1y': 365,
};

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'id requerido' });
  }

  const range = req.query.range || '6m';

  try {
    const supabase = getAdminClient();

    let query = supabase
      .from('product_prices')
      .select('price, created_at')
      .eq('product_id', id)
      .order('created_at', { ascending: true });

    if (range !== 'all') {
      const days = RANGE_DAYS[range] ?? 180;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', since);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching price history:', error);
      return res.status(500).json({ error: error.message });
    }

    const history = (data || []).map((row) => ({
      date: row.created_at,
      price: parseFloat(row.price),
    }));

    const stats = history.length > 0
      ? {
          min: Math.min(...history.map((h) => h.price)),
          max: Math.max(...history.map((h) => h.price)),
          points: history.length,
        }
      : null;

    return res.status(200).json({ history, stats });
  } catch (err) {
    console.error('Unexpected error in price history:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);

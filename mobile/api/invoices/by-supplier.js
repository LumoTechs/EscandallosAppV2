import { getAdminClient } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);
    const supabase = getAdminClient();

    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('total_price, invoices!inner(supplier)')
      .not('invoices.supplier', 'is', null)
      .neq('invoices.supplier', '');

    if (error) {
      console.error('Error fetching invoice items:', error);
      return res.status(500).json({ error: error.message });
    }

    const totals = {};
    for (const item of items || []) {
      const supplier = item.invoices?.supplier;
      if (!supplier) continue;
      totals[supplier] = (totals[supplier] || 0) + parseFloat(item.total_price || 0);
    }

    const suppliers = Object.entries(totals)
      .map(([supplier, total]) => ({ supplier, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    return res.status(200).json({ suppliers });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);

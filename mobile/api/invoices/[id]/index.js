import { getAdminClient } from '../../_lib/supabase.js';
import { requireAuth } from '../../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id requerido' });

  try {
    const supabase = getAdminClient();

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('id, invoice_number, supplier, invoice_date, status, total')
      .eq('id', id)
      .maybeSingle();

    if (invError) {
      console.error('Error fetching invoice:', invError);
      return res.status(500).json({ error: invError.message });
    }
    if (!invoice) {
      return res.status(404).json({ error: 'Factura no encontrada' });
    }

    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('id, product_name, quantity, unit_price, total_price')
      .eq('invoice_id', id)
      .order('product_name');

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      return res.status(500).json({ error: itemsError.message });
    }

    return res.status(200).json({ invoice, items: items || [] });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);

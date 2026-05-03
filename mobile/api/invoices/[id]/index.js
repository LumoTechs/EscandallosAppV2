import { getAdminClient } from '../../_lib/supabase.js';
import { requireAuth } from '../../_lib/auth.js';

// Endpoint dual:
//   GET /api/invoices/by-supplier?limit=6  → top proveedores agregados por importe
//   GET /api/invoices/<uuid>               → detalle de una factura + líneas
// Se consolidan en un único archivo para mantener el cap de 12 funciones de Vercel Hobby.

async function topSuppliers(req, res, supabase) {
  const limit = Math.min(parseInt(req.query.limit) || 6, 20);

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
}

async function invoiceDetail(req, res, supabase, id) {
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('id, invoice_number, supplier, invoice_date, status')
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

  const total = (items || []).reduce((s, it) => s + parseFloat(it.total_price || 0), 0);

  return res.status(200).json({ invoice: { ...invoice, total }, items: items || [] });
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id requerido' });

  try {
    const supabase = getAdminClient();

    if (id === 'by-supplier') {
      return topSuppliers(req, res, supabase);
    }

    return invoiceDetail(req, res, supabase, id);
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);

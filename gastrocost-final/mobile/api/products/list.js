// api/products/list.js
import { getAdminClient } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const search = req.query.search;
    const grouped = req.query.grouped === 'true';
    const supabase = getAdminClient();

    let query = supabase
      .from('products')
      .select('id, name, unit, current_price, supplier, created_at')
      .order('supplier', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (search && search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ error: error.message });
    }

    const products = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      supplier: p.supplier || 'Sin proveedor',
      current_price: p.current_price,
      unit: p.unit,
      last_updated: p.created_at,
    }));

    if (grouped) {
      // Agrupar por proveedor + traer facturas asociadas
      const groups = {};
      for (const p of products) {
        const s = p.supplier;
        if (!groups[s]) groups[s] = { supplier: s, products: [], invoices: [] };
        groups[s].products.push(p);
      }

      // Traer facturas de todos los proveedores
      const suppliers = Object.keys(groups).filter((s) => s !== 'Sin proveedor');
      if (suppliers.length > 0) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, supplier, invoice_date, invoice_number, status')
          .in('supplier', suppliers)
          .order('invoice_date', { ascending: false });

        for (const inv of invoices || []) {
          if (groups[inv.supplier]) {
            groups[inv.supplier].invoices.push(inv);
          }
        }

        // Contar items por factura (en una sola consulta)
        const invIds = (invoices || []).map((i) => i.id);
        if (invIds.length > 0) {
          const { data: itemsCounts } = await supabase
            .from('invoice_items')
            .select('invoice_id, total_price')
            .in('invoice_id', invIds);

          const countMap = {};
          const totalMap = {};
          for (const it of itemsCounts || []) {
            countMap[it.invoice_id] = (countMap[it.invoice_id] || 0) + 1;
            totalMap[it.invoice_id] = (totalMap[it.invoice_id] || 0) + parseFloat(it.total_price || 0);
          }

          for (const s of suppliers) {
            groups[s].invoices = groups[s].invoices.map((inv) => ({
              ...inv,
              items_count: countMap[inv.id] || 0,
              total: totalMap[inv.id] || 0,
            }));
          }
        }
      }

      return res.status(200).json({ groups: Object.values(groups) });
    }

    return res.status(200).json({ products });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

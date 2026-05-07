// api/products/list.js
// GET  ?grouped=true  → productos agrupados por proveedor + facturas
// GET  ?suppliers=true → lista de proveedores únicos + aliases
// POST               → crear alias de proveedor { alias, canonical }
// DELETE             → eliminar alias { alias }
import { getAdminClient } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';

// Clave de agrupación normalizada: minúsculas, sin formas legales, sin espacios extra.
function supplierKey(name) {
  if (!name || name === 'Sin proveedor') return '\x00';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[,\s]*(s\.?\s*a\.?\s*u?\.?|s\.?\s*l\.?\s*u?\.?|s\.?\s*c(?:oop)?\.?|c\.?\s*b\.?|s\.?\s*a\.?\s*t\.?)\s*\.?\s*$/gi, '')
    .trim();
}

async function handler(req, res) {
  const supabase = getAdminClient();

  // POST → crear alias
  if (req.method === 'POST') {
    const { alias, canonical } = req.body || {};
    if (!alias || !canonical) return res.status(400).json({ error: 'alias y canonical son requeridos' });
    if (alias.trim().toLowerCase() === canonical.trim().toLowerCase()) {
      return res.status(400).json({ error: 'Los dos proveedores deben ser diferentes' });
    }
    const { error } = await supabase
      .from('supplier_aliases')
      .upsert({ alias: alias.trim(), canonical: canonical.trim() }, { onConflict: 'alias' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  // DELETE → eliminar alias
  if (req.method === 'DELETE') {
    const { alias } = req.body || {};
    if (!alias) return res.status(400).json({ error: 'alias requerido' });
    const { error } = await supabase.from('supplier_aliases').delete().eq('alias', alias.trim());
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    // GET ?suppliers=true → lista proveedores + aliases (para el modal de unificación)
    if (req.query.suppliers === 'true') {
      const [{ data: products }, { data: aliases }] = await Promise.all([
        supabase.from('products').select('supplier').not('supplier', 'is', null),
        supabase.from('supplier_aliases').select('alias, canonical'),
      ]);
      const names = [...new Set((products || []).map((p) => p.supplier).filter(Boolean))].sort();
      return res.status(200).json({ suppliers: names, aliases: aliases || [] });
    }

    const search = req.query.search;
    const grouped = req.query.grouped === 'true';

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
      const { data: aliasRows } = await supabase.from('supplier_aliases').select('alias, canonical');
      const aliasMap = {};
      for (const row of aliasRows || []) aliasMap[row.alias] = row.canonical;

      const resolveSupplier = (name) => aliasMap[name] || aliasMap[supplierKey(name)] || name;

      const groups = {};
      for (const p of products) {
        const resolved = resolveSupplier(p.supplier);
        const key = supplierKey(resolved);
        if (!groups[key]) {
          groups[key] = { supplier: resolved, rawNames: new Set(), products: [], invoices: [] };
        }
        groups[key].rawNames.add(p.supplier);
        groups[key].products.push(p);
      }

      const allRawNames = [];
      for (const g of Object.values(groups)) {
        if (g.supplier !== 'Sin proveedor') {
          for (const n of g.rawNames) allRawNames.push(n);
        }
      }

      if (allRawNames.length > 0) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, supplier, invoice_date, invoice_number, status, created_at')
          .in('supplier', allRawNames)
          .order('created_at', { ascending: false });

        for (const inv of invoices || []) {
          const key = supplierKey(inv.supplier);
          if (groups[key]) groups[key].invoices.push(inv);
        }

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

          for (const g of Object.values(groups)) {
            g.invoices = g.invoices.map((inv) => ({
              ...inv,
              items_count: countMap[inv.id] || 0,
              total: totalMap[inv.id] || 0,
            }));
          }
        }
      }

      const result = Object.values(groups).map(({ rawNames, ...g }) => g);
      return res.status(200).json({ groups: result });
    }

    return res.status(200).json({ products });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);

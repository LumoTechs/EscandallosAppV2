// api/products/list.js
// GET  ?grouped=true  → productos agrupados por proveedor + facturas
// GET  ?suppliers=true → lista de proveedores únicos + aliases
// POST               → crear alias de proveedor { alias, canonical }
// DELETE             → eliminar alias { alias }
import { getUserClient } from '../_lib/supabase.js';
import { requireAuth, rateLimit, compose } from '../_lib/auth.js';

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

function isMissingSupplierAliasesTable(error) {
  if (!error) return false;
  return error.code === '42P01' || /supplier_aliases/i.test(error.message || '');
}

async function handler(req, res) {
  const supabase = getUserClient(req.headers.authorization);

  // POST → crear o actualizar alias de proveedor
  if (req.method === 'POST') {
    const { alias, canonical } = req.body || {};
    if (!alias || !canonical) return res.status(400).json({ error: 'alias y canonical son requeridos' });
    const aliasNormalized = supplierKey(alias);
    const canonicalNormalized = supplierKey(canonical);
    if (!aliasNormalized || aliasNormalized === '\x00') {
      return res.status(400).json({ error: 'El alias no es válido' });
    }
    if (!canonicalNormalized || canonicalNormalized === '\x00') {
      return res.status(400).json({ error: 'El proveedor principal no es válido' });
    }
    if (aliasNormalized === canonicalNormalized) {
      return res.status(400).json({ error: 'Los dos proveedores deben ser diferentes' });
    }
    const { error } = await supabase
      .from('supplier_aliases')
      .upsert({ alias: aliasNormalized, canonical: canonical.trim() }, { onConflict: 'restaurant_id,alias' });
    if (error) {
      if (isMissingSupplierAliasesTable(error)) {
        return res.status(500).json({ error: 'Falta la tabla supplier_aliases en Supabase.' });
      }
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true });
  }

  // DELETE → eliminar alias
  if (req.method === 'DELETE') {
    const { alias } = req.body || {};
    if (!alias) return res.status(400).json({ error: 'alias requerido' });
    const { error } = await supabase.from('supplier_aliases').delete().eq('alias', supplierKey(alias));
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
    const page = Math.max(0, parseInt(req.query.page || '0', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '100', 10)));
    const from = page * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('products')
      .select('id, name, unit, current_price, supplier, created_at', { count: 'exact' })
      .order('supplier', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (search && search.trim()) {
      const s = search.trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
      query = query.ilike('name', `%${s}%`);
    }

    if (!grouped) {
      query = query.range(from, to);
    }

    const { data, error, count } = await query;
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
      const { data: aliasRows, error: aliasError } = await supabase
        .from('supplier_aliases')
        .select('alias, canonical');
      if (aliasError && !isMissingSupplierAliasesTable(aliasError)) {
        console.error('Error fetching supplier aliases:', aliasError);
        return res.status(500).json({ error: aliasError.message });
      }
      const aliasMap = {};
      for (const row of aliasRows || []) {
        const k = supplierKey(row.alias);
        if (k && k !== '\x00') aliasMap[k] = row.canonical.trim();
      }
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
          const key = supplierKey(resolveSupplier(inv.supplier));
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

    return res.status(200).json({ products, total: count ?? products.length, page, limit });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default compose(rateLimit({ limit: 200, windowMs: 60 * 60 * 1000 }), requireAuth)(handler);

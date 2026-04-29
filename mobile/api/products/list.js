// api/products/list.js
import { getAdminClient } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';

// Clave de agrupación normalizada: minúsculas, sin formas legales, sin espacios extra.
// Permite fusionar "MAKRO S.A.", "Makro" y "makro" en un mismo grupo.
function supplierKey(name) {
  if (!name || name === 'Sin proveedor') return '\x00'; // ordena al final
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[,\s]*(s\.?\s*a\.?\s*u?\.?|s\.?\s*l\.?\s*u?\.?|s\.?\s*c(?:oop)?\.?|c\.?\s*b\.?|s\.?\s*a\.?\s*t\.?)\s*\.?\s*$/gi, '')
    .trim();
}

async function handler(req, res) {
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
      // Agrupar por clave normalizada: fusiona variantes del mismo proveedor
      // (ej. "MAKRO S.A." y "Makro" van al mismo grupo)
      const groups = {};
      for (const p of products) {
        const key = supplierKey(p.supplier);
        if (!groups[key]) {
          groups[key] = {
            supplier: p.supplier,      // nombre a mostrar: primer valor visto
            rawNames: new Set(),       // todas las variantes para buscar facturas
            products: [],
            invoices: [],
          };
        }
        groups[key].rawNames.add(p.supplier);
        groups[key].products.push(p);
      }

      // Recoger todas las variantes de nombre para la query de facturas
      const allRawNames = [];
      for (const g of Object.values(groups)) {
        if (g.supplier !== 'Sin proveedor') {
          for (const n of g.rawNames) allRawNames.push(n);
        }
      }

      if (allRawNames.length > 0) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, supplier, invoice_date, invoice_number, status')
          .in('supplier', allRawNames)
          .order('invoice_date', { ascending: false });

        // Asignar cada factura al grupo por clave normalizada
        for (const inv of invoices || []) {
          const key = supplierKey(inv.supplier);
          if (groups[key]) groups[key].invoices.push(inv);
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

          for (const g of Object.values(groups)) {
            g.invoices = g.invoices.map((inv) => ({
              ...inv,
              items_count: countMap[inv.id] || 0,
              total: totalMap[inv.id] || 0,
            }));
          }
        }
      }

      // Eliminar rawNames del output (interno, no necesario en el frontend)
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

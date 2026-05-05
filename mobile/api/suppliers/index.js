// GET  → lista de proveedores únicos + sus aliases
// POST { alias, canonical } → crea o actualiza un alias
// DELETE { alias } → elimina un alias

import { getAdminClient } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';

async function handler(req, res) {
  const supabase = getAdminClient();

  if (req.method === 'GET') {
    const [{ data: products }, { data: aliases }] = await Promise.all([
      supabase.from('products').select('supplier').not('supplier', 'is', null),
      supabase.from('supplier_aliases').select('alias, canonical'),
    ]);

    const names = [...new Set((products || []).map((p) => p.supplier).filter(Boolean))].sort();
    return res.status(200).json({ suppliers: names, aliases: aliases || [] });
  }

  if (req.method === 'POST') {
    const { alias, canonical } = req.body || {};
    if (!alias || !canonical) {
      return res.status(400).json({ error: 'alias y canonical son requeridos' });
    }
    if (alias.trim().toLowerCase() === canonical.trim().toLowerCase()) {
      return res.status(400).json({ error: 'Los dos proveedores deben ser diferentes' });
    }
    const { error } = await supabase
      .from('supplier_aliases')
      .upsert({ alias: alias.trim(), canonical: canonical.trim() }, { onConflict: 'alias' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE') {
    const { alias } = req.body || {};
    if (!alias) return res.status(400).json({ error: 'alias requerido' });
    const { error } = await supabase.from('supplier_aliases').delete().eq('alias', alias.trim());
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

export default requireAuth(handler);

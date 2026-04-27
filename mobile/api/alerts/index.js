// GET  → lista de alertas (?unread_only=true)
// POST → marcar alerta como leída { id }
// DELETE → eliminar alerta { id }

import { getAdminClient } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';

async function handler(req, res) {
  const supabase = getAdminClient();

  // ── GET ──────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const unreadOnly = req.query.unread_only === 'true';

      let q = supabase
        .from('alerts')
        .select(`id, message, severity, read, created_at, product_id, recipe_id, products ( name )`)
        .order('created_at', { ascending: false });

      if (unreadOnly) q = q.eq('read', false);

      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message });

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
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST (marcar como leída) ──────────────────────────
  if (req.method === 'POST') {
    try {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id requerido' });

      const { data, error } = await supabase
        .from('alerts')
        .update({ read: true })
        .eq('id', id)
        .select('id');

      if (error) return res.status(500).json({ error: error.message });
      if (!data || data.length === 0) return res.status(404).json({ error: 'Alerta no encontrada' });

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── DELETE ────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id requerido' });

      const { data, error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) return res.status(500).json({ error: error.message });
      if (!data || data.length === 0) return res.status(404).json({ error: 'Alerta no encontrada' });

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

export default requireAuth(handler);

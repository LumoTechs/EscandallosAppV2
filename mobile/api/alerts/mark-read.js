// api/alerts/mark-read.js
import { getAdminClient } from '../_lib/supabase.js';
import { requireSharedSecret } from '../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'id requerido' });
    }

    const supabase = getAdminClient();

    const { data, error } = await supabase
      .from('alerts')
      .update({ read: true })
      .eq('id', id)
      .select('id');

    if (error) {
      console.error('Error marking alert as read:', error);
      return res.status(500).json({ error: error.message });
    }
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default requireSharedSecret(handler);

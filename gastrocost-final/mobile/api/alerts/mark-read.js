// api/alerts/mark-read.js
import { getAdminClient } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id } = req.body || {};

    if (!id) {
      return res.status(400).json({ error: 'id requerido' });
    }

    const supabase = getAdminClient();

    const { error } = await supabase
      .from('alerts')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      console.error('Error marking alert as read:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

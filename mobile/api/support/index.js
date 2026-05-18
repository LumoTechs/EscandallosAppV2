// GET  /api/support              → lista de tickets del usuario
// GET  /api/support?ticket_id=x  → detalle con respuestas
// POST /api/support { subject, description }       → crear ticket
// POST /api/support { ticket_id, message }         → añadir respuesta

import { getAdminClient } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';

async function handler(req, res) {
  const supabase = getAdminClient();
  const { user_id, email } = req.user;

  if (req.method === 'GET') {
    const { ticket_id } = req.query;

    if (ticket_id) {
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticket_id)
        .eq('user_id', user_id)
        .single();

      if (error || !ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

      const { data: replies } = await supabase
        .from('support_replies')
        .select('*')
        .eq('ticket_id', ticket_id)
        .order('created_at', { ascending: true });

      return res.status(200).json({ ticket, replies: replies || [] });
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ tickets: data || [] });
  }

  if (req.method === 'POST') {
    const { subject, description, ticket_id, message } = req.body || {};

    if (ticket_id && message) {
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('id', ticket_id)
        .eq('user_id', user_id)
        .single();

      if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

      const { data: reply, error } = await supabase
        .from('support_replies')
        .insert({ ticket_id, author: 'user', message })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ reply });
    }

    if (subject && description) {
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .insert({ user_id, email, subject, description })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ ticket });
    }

    return res.status(400).json({ error: 'Parámetros inválidos' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

export default requireAuth(handler);

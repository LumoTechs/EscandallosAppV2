// api/users/index.js
// POST → crea un nuevo usuario en Supabase Auth con email confirmado automáticamente.
// Solo accesible para usuarios autenticados.

import { getAdminClient } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email, password, full_name } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
  }

  const supabase = getAdminClient();

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      ...(full_name?.trim() ? { user_metadata: { full_name: full_name.trim() } } : {}),
    });

    if (error) {
      console.error('Error creando usuario:', error);
      if (error.message?.toLowerCase().includes('already registered')) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
    });
  } catch (err) {
    console.error('Unexpected error creando usuario:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);

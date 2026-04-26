// api/_lib/supabase.js
// Cliente admin de Supabase para usar SOLO en API routes (server-side)
// Usa la SERVICE_ROLE_KEY que bypassa RLS

import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

export function getAdminClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL no configurada');
  }
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada');
  }

  cachedClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cachedClient;
}

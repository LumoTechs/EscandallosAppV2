// api/_lib/supabase.js
// Dos clientes Supabase server-side:
// - getUserClient(authHeader): respeta RLS con el JWT del user. Usar en endpoints protegidos por requireAuth.
// - getAdminClient(): bypassa RLS con SERVICE_ROLE_KEY. Solo para webhook Stripe (sin JWT) o trabajos sin user.

import { createClient } from '@supabase/supabase-js';

let cachedAdminClient = null;

export function getAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error('EXPO_PUBLIC_SUPABASE_URL no configurada');
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY no configurada');

  cachedAdminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdminClient;
}

// Cliente con anon key + JWT del user en cabecera. RLS aplica con auth.uid()=user.
// IMPORTANTE: no se cachea — cada request lleva un JWT distinto.
export function getUserClient(authHeader) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error('EXPO_PUBLIC_SUPABASE_URL no configurada');
  if (!anonKey) throw new Error('EXPO_PUBLIC_SUPABASE_ANON_KEY no configurada');
  if (!authHeader || typeof authHeader !== 'string') {
    throw new Error('getUserClient requiere el header Authorization completo del request');
  }

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
}

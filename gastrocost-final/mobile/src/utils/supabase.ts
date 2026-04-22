import { createClient } from '@supabase/supabase-js';

// =====================================================
// Cliente para USO EN FRONTEND (pantallas, componentes)
// Usa la ANON key, es seguro exponer
// =====================================================
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================
// Cliente ADMIN para USO EN API ROUTES (servidor)
// Usa la SERVICE_ROLE key, bypassa RLS
// NUNCA importar esto desde componentes de frontend
// =====================================================
export function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY no está configurada en variables de entorno'
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

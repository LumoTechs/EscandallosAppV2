import { createClient } from '@supabase/supabase-js';

// Cliente para USO EN FRONTEND (pantallas, componentes). Usa la ANON key.
// Para acceso server-side con SERVICE_ROLE, usa getAdminClient en api/_lib/supabase.js.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

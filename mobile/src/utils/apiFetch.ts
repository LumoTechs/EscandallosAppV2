import { supabase } from './supabase';

// Wrapper sobre fetch que adjunta el JWT actual de Supabase en el header
// Authorization. Si el backend responde 401 con un token que sí enviamos,
// asumimos que la sesión ha caducado y la cerramos para que el AuthGate
// redirija a /login (evita pantallas vacías por token expirado).
export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && token) {
    await supabase.auth.signOut();
  }
  return res;
}

export default apiFetch;

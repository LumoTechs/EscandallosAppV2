import { supabase } from './supabase';

// Wrapper sobre fetch que adjunta el JWT actual de Supabase en el header
// Authorization. Mismo contrato que fetch global salvo por el header automático.
export async function apiFetch(input: RequestInfo, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

export default apiFetch;

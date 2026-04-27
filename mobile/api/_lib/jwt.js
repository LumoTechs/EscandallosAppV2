// api/_lib/jwt.js
// Verificación local de JWT Supabase (ES256 con JWKS) para evitar el roundtrip
// HTTP a Supabase Auth en cada request. JWKS se cachea 1h en memoria del lambda
// y se refetcha si el kid del token no está en cache (rotación de claves).

import { createPublicKey, verify } from 'crypto';

const JWKS_TTL_MS = 60 * 60 * 1000; // 1h

let cache = { keys: new Map(), fetchedAt: 0 };

function baseUrl() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('EXPO_PUBLIC_SUPABASE_URL no configurada');
  return url.replace(/\/$/, '');
}

function jwksUrl() {
  return `${baseUrl()}/auth/v1/.well-known/jwks.json`;
}

function expectedIssuer() {
  return `${baseUrl()}/auth/v1`;
}

async function refetchJwks() {
  const res = await fetch(jwksUrl());
  if (!res.ok) throw new Error(`JWKS HTTP ${res.status}`);
  const data = await res.json();
  const keys = new Map();
  for (const jwk of data.keys || []) {
    if (!jwk.kid) continue;
    keys.set(jwk.kid, createPublicKey({ key: jwk, format: 'jwk' }));
  }
  cache = { keys, fetchedAt: Date.now() };
}

async function getKey(kid) {
  const fresh = Date.now() - cache.fetchedAt < JWKS_TTL_MS;
  if (fresh && cache.keys.has(kid)) return cache.keys.get(kid);
  await refetchJwks();
  const key = cache.keys.get(kid);
  if (!key) throw new Error(`Kid desconocido: ${kid}`);
  return key;
}

function b64url(part) {
  return Buffer.from(part, 'base64url');
}

export async function verifySupabaseJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token malformado');

  const header = JSON.parse(b64url(parts[0]).toString());
  if (header.alg !== 'ES256') throw new Error(`Algoritmo no soportado: ${header.alg}`);
  if (!header.kid) throw new Error('Token sin kid');

  const key = await getKey(header.kid);
  const signedData = Buffer.from(`${parts[0]}.${parts[1]}`);
  const signature = b64url(parts[2]);

  // ieee-p1363 = formato r||s usado por JWS, no DER de OpenSSL.
  const ok = verify('sha256', signedData, { key, dsaEncoding: 'ieee-p1363' }, signature);
  if (!ok) throw new Error('Firma inválida');

  const payload = JSON.parse(b64url(parts[1]).toString());

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    throw new Error('Token expirado');
  }
  // Permitimos hasta 60s de skew para iat futuros (relojes desincronizados).
  if (typeof payload.iat === 'number' && payload.iat > now + 60) {
    throw new Error('iat futuro');
  }
  if (payload.iss && payload.iss !== expectedIssuer()) {
    throw new Error('Issuer inválido');
  }
  if (!payload.sub) throw new Error('Token sin sub');

  return payload;
}

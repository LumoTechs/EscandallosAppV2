// api/_lib/auth.js
// Middlewares de protección para endpoints públicos.
// MVP placeholder hasta que llegue auth real con Supabase JWT + RLS por restaurant_id.

const DEFAULT_ALLOWED_HOSTS = [
  /^localhost(:\d+)?$/i,
  /\.vercel\.app$/i,
];

function parseAllowedHosts() {
  const env = process.env.ALLOWED_ORIGINS;
  if (!env) return DEFAULT_ALLOWED_HOSTS;
  return env.split(',').map((h) => {
    const trimmed = h.trim();
    if (trimmed.startsWith('*.')) {
      const suffix = trimmed.slice(2).replace(/\./g, '\\.');
      return new RegExp(`\\.${suffix}$`, 'i');
    }
    return new RegExp(`^${trimmed.replace(/\./g, '\\.')}$`, 'i');
  });
}

function hostFromHeader(value) {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export function requireSameOrigin(handler) {
  return async (req, res) => {
    const allowed = parseAllowedHosts();
    const host = hostFromHeader(req.headers.origin) || hostFromHeader(req.headers.referer);
    if (!host) {
      return res.status(403).json({ error: 'Origen requerido' });
    }
    if (!allowed.some((re) => re.test(host))) {
      return res.status(403).json({ error: 'Origen no permitido' });
    }
    return handler(req, res);
  };
}

// In-memory rate limit por IP. Se reinicia con cada cold start del lambda;
// suficiente como freno contra scrapers, no como defensa robusta.
const rateBuckets = new Map();

function getIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

export function rateLimit({ limit, windowMs }) {
  return (handler) => async (req, res) => {
    const ip = getIp(req);
    const now = Date.now();
    const b = rateBuckets.get(ip);
    if (!b || b.resetAt < now) {
      rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    } else if (b.count >= limit) {
      const retryAfter = Math.ceil((b.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: `Demasiadas peticiones. Reintenta en ${retryAfter}s.`,
      });
    } else {
      b.count++;
    }
    return handler(req, res);
  };
}

// No-op cuando API_SHARED_SECRET no está configurado. Permite desplegar el código
// de protección antes de que el frontend mande el header. Activación = setear la
// env var en Vercel una vez el frontend envíe `x-api-key`.
export function requireSharedSecret(handler) {
  return async (req, res) => {
    const expected = process.env.API_SHARED_SECRET;
    if (!expected) return handler(req, res);
    const provided = req.headers['x-api-key'];
    if (provided !== expected) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    return handler(req, res);
  };
}

// Compone middlewares de izquierda a derecha: el primero se ejecuta primero.
export function compose(...middlewares) {
  return (handler) => middlewares.reduceRight((h, mw) => mw(h), handler);
}

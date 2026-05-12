// api/stripe/portal.js
// Genera una URL al Customer Portal de Stripe para que el usuario gestione
// su suscripción (cambiar plan, cancelar, actualizar tarjeta, ver facturas).

import { compose, rateLimit, requireSameOrigin, requireAuth } from '../_lib/auth.js';
import { getAdminClient } from '../_lib/supabase.js';
import { getStripe, appBaseUrl } from '../_lib/stripe.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });

  const supabase = getAdminClient();
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('portal lookup error:', error);
    return res.status(500).json({ error: 'Error consultando suscripción' });
  }
  if (!sub?.stripe_customer_id) {
    return res.status(404).json({ error: 'No tienes suscripción activa' });
  }

  try {
    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appBaseUrl(req)}/`,
    });
    return res.status(200).json({ url: portal.url });
  } catch (err) {
    console.error('portal error:', err);
    return res.status(500).json({ error: err.message || 'Error abriendo portal' });
  }
}

export default compose(
  rateLimit({ limit: 30, windowMs: 60 * 60 * 1000 }),
  requireSameOrigin,
  requireAuth,
)(handler);

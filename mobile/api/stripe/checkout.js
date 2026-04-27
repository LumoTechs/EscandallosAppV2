// api/stripe/checkout.js
// Crea una Checkout Session de Stripe para un plan. Requiere usuario autenticado.
// Reutiliza el customer si ya hay subscripción registrada para evitar duplicados.

import { compose, rateLimit, requireSameOrigin, requireAuth } from '../_lib/auth.js';
import { getAdminClient } from '../_lib/supabase.js';
import { getStripe, priceForPlan, VALID_PLANS, appBaseUrl } from '../_lib/stripe.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { plan } = req.body || {};
  if (!plan || !VALID_PLANS.includes(plan)) {
    return res.status(400).json({ error: 'Plan inválido' });
  }

  const priceId = priceForPlan(plan);
  if (!priceId) {
    return res.status(500).json({ error: `Price ID no configurado para plan ${plan}` });
  }

  const userId = req.user?.id;
  const email = req.user?.email;
  if (!userId) return res.status(401).json({ error: 'Usuario no identificado' });

  const supabase = getAdminClient();
  const stripe = getStripe();

  try {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
    }

    const base = appBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${base}/?subscription=success`,
      cancel_url: `${base}/planes?canceled=1`,
      subscription_data: {
        metadata: { user_id: userId, plan },
      },
    });

    return res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('checkout error:', err);
    return res.status(500).json({ error: err.message || 'Error creando checkout' });
  }
}

export default compose(
  rateLimit({ limit: 20, windowMs: 60 * 60 * 1000 }),
  requireSameOrigin,
  requireAuth,
)(handler);

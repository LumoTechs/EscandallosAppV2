// api/stripe/webhook.js
// Recibe eventos de Stripe, verifica firma con STRIPE_WEBHOOK_SECRET y persiste
// el estado de la suscripción en la tabla `subscriptions`.
// IMPORTANTE: necesitamos el body en raw para verificar la firma — por eso
// `bodyParser: false` y leemos el stream a mano.

import { getStripe, planForPrice } from '../_lib/stripe.js';
import { getAdminClient } from '../_lib/supabase.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function resolveUserId(supabase, sub, fallback) {
  if (sub.metadata?.user_id) return sub.metadata.user_id;
  if (fallback) return fallback;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  return data?.user_id || null;
}

async function upsertSubscription(supabase, sub, fallbackUserId) {
  const priceId = sub.items?.data?.[0]?.price?.id || null;
  const plan = planForPrice(priceId);
  const userId = await resolveUserId(supabase, sub, fallbackUserId);
  if (!userId) {
    console.warn('webhook: subscription sin user_id resoluble', sub.id);
    return;
  }
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  const row = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    plan,
    status: sub.status,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
  };
  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'user_id' });
  if (error) console.error('upsert subscription error:', error);
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET no configurado' });
  }
  if (!sig) {
    return res.status(400).json({ error: 'Falta cabecera stripe-signature' });
  }

  const stripe = getStripe();
  const supabase = getAdminClient();
  const rawBody = await readRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.warn('webhook firma inválida:', err.message);
    return res.status(400).json({ error: 'Firma inválida' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        const userId = s.client_reference_id || s.metadata?.user_id || null;
        if (s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription);
          await upsertSubscription(supabase, sub, userId);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertSubscription(supabase, event.data.object, null);
        break;
      }
      default:
        // No-op: solo respondemos 200 para que Stripe no reintente.
        break;
    }
  } catch (err) {
    // 5xx haría que Stripe reintentase; preferimos 200 + log para no acumular.
    console.error('webhook handler error:', err);
    return res.status(200).json({ received: true, processed: false });
  }

  return res.status(200).json({ received: true });
}

export default handler;

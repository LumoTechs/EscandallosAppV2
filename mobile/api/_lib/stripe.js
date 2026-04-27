// api/_lib/stripe.js
// Cliente Stripe singleton + helpers de mapeo plan <-> price ID.
// Las price IDs viven en env vars para poder cambiar test/live sin tocar código.

import Stripe from 'stripe';

let cached = null;

export function getStripe() {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY no configurada');
  }
  cached = new Stripe(key, {
    apiVersion: '2024-12-18.acacia',
    appInfo: { name: 'Lumotech', version: '1.0.0' },
  });
  return cached;
}

export const VALID_PLANS = ['basico', 'pro', 'premium'];

export function priceForPlan(plan) {
  switch (plan) {
    case 'basico':
      return process.env.STRIPE_PRICE_BASIC;
    case 'pro':
      return process.env.STRIPE_PRICE_PRO;
    case 'premium':
      return process.env.STRIPE_PRICE_PREMIUM;
    default:
      return null;
  }
}

export function planForPrice(priceId) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_BASIC) return 'basico';
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return 'premium';
  return null;
}

export function appBaseUrl(req) {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL;
  const origin = req?.headers?.origin;
  if (origin) return origin;
  return 'https://lumotech.app';
}

// api/_lib/aiUsage.js
// Helper para loguear cada llamada a Anthropic con tokens y coste estimado.
// Insert via service_role: nunca bloquea el flujo (try/catch interno + no-op si falla).
// Lo lee el "Centro Control Lumo" via service_role para mostrar consumo por mes/endpoint.

import { getAdminClient } from './supabase.js';

// Precios USD por 1M tokens (actualizar cuando Anthropic cambie tarifas).
// Source: https://www.anthropic.com/pricing
const PRICING_USD_PER_M = {
  'claude-opus-4-7': { input: 15, output: 75, cached: 1.5 },
  'claude-opus-4-6': { input: 15, output: 75, cached: 1.5 },
  'claude-sonnet-4-6': { input: 3, output: 15, cached: 0.3 },
  'claude-haiku-4-5': { input: 1, output: 5, cached: 0.1 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5, cached: 0.1 },
};

const USD_TO_EUR = 0.92; // ajustar si quieres mas precision

function estimateCostEur(model, usage) {
  const tier = PRICING_USD_PER_M[model];
  if (!tier) return 0;
  const input = (usage.input_tokens || 0) * tier.input / 1_000_000;
  const output = (usage.output_tokens || 0) * tier.output / 1_000_000;
  const cached = (usage.cache_read_input_tokens || 0) * tier.cached / 1_000_000;
  return (input + output + cached) * USD_TO_EUR;
}

/**
 * Registra una llamada a Anthropic en `ai_usage`. Nunca tira excepciones.
 *
 * @param {object} args
 * @param {string} args.endpoint - p.ej. 'invoices/process' o 'dashboard/savings-estimate'
 * @param {string} args.model - p.ej. 'claude-opus-4-7'
 * @param {string|null} args.restaurantId - id del restaurante que origino la llamada
 * @param {object} args.usage - objeto `usage` que devuelve la API de Anthropic
 * @param {number} [args.durationMs]
 * @param {object} [args.metadata]
 */
export async function logAiUsage({ endpoint, model, restaurantId, usage, durationMs, metadata }) {
  if (!usage) return;
  try {
    const supabase = getAdminClient();
    await supabase.from('ai_usage').insert({
      endpoint,
      model,
      restaurant_id: restaurantId || null,
      input_tokens: usage.input_tokens || 0,
      output_tokens: usage.output_tokens || 0,
      cached_tokens: usage.cache_read_input_tokens || 0,
      cost_eur: estimateCostEur(model, usage),
      duration_ms: durationMs ?? null,
      metadata: metadata ?? null,
    });
  } catch (err) {
    // No queremos que un fallo de logging tumbe el endpoint del cliente.
    console.warn('logAiUsage falló:', err?.message);
  }
}

// Resuelve el restaurant_id del user actual (para endpoints que no lo tienen explicito).
// Devuelve null si no se puede determinar.
export async function resolveRestaurantId(userClient, userId) {
  try {
    if (userClient) {
      const { data } = await userClient
        .from('restaurant_members')
        .select('restaurant_id')
        .limit(1)
        .maybeSingle();
      return data?.restaurant_id || null;
    }
    if (userId) {
      const admin = getAdminClient();
      const { data } = await admin
        .from('restaurant_members')
        .select('restaurant_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      return data?.restaurant_id || null;
    }
  } catch {}
  return null;
}

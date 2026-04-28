import { getAdminClient } from '../_lib/supabase.js';
import { requireAuth } from '../_lib/auth.js';

// Cache 24 h por instancia lambda
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (_cache && Date.now() - _cacheAt < CACHE_TTL) {
    return res.status(200).json(_cache);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada' });
  }

  try {
    const supabase = getAdminClient();

    const [
      { data: recipes },
      { data: invoiceItems },
      { count: productsCount },
      { count: alertsCount },
    ] = await Promise.all([
      supabase
        .from('recipes')
        .select('name, category, actual_food_cost_percentage, target_food_cost_percentage, sale_price, total_cost'),
      supabase.from('invoice_items').select('total_price'),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('alerts').select('*', { count: 'exact', head: true }),
    ]);

    const totalSpend = (invoiceItems || []).reduce(
      (sum, i) => sum + parseFloat(i.total_price || 0),
      0
    );

    const recipesSummary = (recipes || []).map((r) => ({
      nombre: r.name,
      categoria: r.category,
      food_cost_real: parseFloat(r.actual_food_cost_percentage || 0).toFixed(1) + '%',
      food_cost_objetivo: parseFloat(r.target_food_cost_percentage || 35).toFixed(1) + '%',
      precio_venta_eur: parseFloat(r.sale_price || 0).toFixed(2),
      coste_ingredientes_eur: parseFloat(r.total_cost || 0).toFixed(2),
    }));

    const prompt = `Eres el motor de análisis financiero de GastroCost, app de control de costes para hostelería española.

DATOS REALES DEL RESTAURANTE:

Escandallos registrados (${recipesSummary.length} platos):
${JSON.stringify(recipesSummary, null, 2)}

Total compras procesadas por la app: €${totalSpend.toFixed(2)}
Productos en catálogo: ${productsCount ?? 0}
Alertas de precio generadas: ${alertsCount ?? 0}

TAREA:
Estima cuánto dinero ha ahorrado este restaurante gracias a usar GastroCost desde que empezó a usarla.

Considera estos factores:
1. Optimización de food cost: para cada plato con food_cost_real < food_cost_objetivo hay ahorro real. Asume un restaurante español pequeño-mediano (50-100 cubiertos/día, 25 días/mes activos).
2. Control de proveedores: visibilidad de precios y alertas permiten negociar. Estima 2-4% de ahorro sobre el total de compras si hay alertas activas.
3. Reducción de errores en pedidos: digitalizar facturas reduce sobre-pedidos (~1-2% del gasto).

Si hay pocos datos, haz una estimación conservadora pero realista. No exageres.

Devuelve SOLO este JSON (sin texto adicional):
{
  "savings_eur": <entero, ahorro total acumulado estimado en €>,
  "monthly_trend": [<6 enteros: ahorro mensual estimado del mes más antiguo al más reciente, mostrando crecimiento progresivo>],
  "summary": "<frase de 8-12 palabras explicando el ahorro principal>"
}`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Error Anthropic savings-estimate:', errText);
      return res.status(500).json({ error: 'Error al calcular estimación' });
    }

    const anthropicData = await anthropicRes.json();
    const textBlock = anthropicData.content?.find((c) => c.type === 'text');
    if (!textBlock) throw new Error('Respuesta vacía de Opus');

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No se encontró JSON en respuesta de Opus');
    const result = JSON.parse(jsonMatch[0]);

    if (typeof result.savings_eur !== 'number' || !Array.isArray(result.monthly_trend)) {
      throw new Error('JSON malformado en respuesta de Opus');
    }

    // Normalizar monthly_trend a exactamente 6 elementos
    while (result.monthly_trend.length < 6) result.monthly_trend.unshift(0);
    result.monthly_trend = result.monthly_trend.slice(-6).map(Number);

    _cache = result;
    _cacheAt = Date.now();

    return res.status(200).json(result);
  } catch (err) {
    console.error('Error en savings-estimate:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);

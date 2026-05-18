// api/invoices/process.js
import { getAdminClient } from '../_lib/supabase.js';
import { pool } from '../_lib/db.js';
import { compose, rateLimit, requireSameOrigin, requireAuth } from '../_lib/auth.js';

// ============================================
// PROMPT REFORZADO para OCR de facturas
// ============================================
// Mejoras clave vs versión anterior:
// - Normaliza unidades complejas (cajas, packs, bultos → unidad base)
// - Calcula coste por unidad base real (€/kg, €/L, €/ud)
// - Extrae proveedor con más robustez
// - Conserva formato original en pack_info
const EXTRACTION_PROMPT = `Eres un experto analizando facturas de proveedores de alimentación y hostelería.

Tu misión: extraer los datos de esta factura en formato JSON. PRESTA MÁXIMA ATENCIÓN a las unidades y cantidades, ya que las facturas mezclan formatos (kg, litros, cajas, packs, bultos, unidades sueltas).

REGLAS CRÍTICAS DE NORMALIZACIÓN:

1) Si un producto viene por CAJA, PACK, BULTO o agrupado, DESAGRÉGALO:
   - "Caja 12 ud Coca-Cola 330ml" (12 uds = 3,96L) → quantity: 12, unit: "ud", pack_info: "caja 12 ud", cost_per_unit_normalized: precio_total / 12
   - "Aceite oliva 5L x 4 garrafas" → quantity: 20, unit: "L", pack_info: "4 garrafas de 5L", cost_per_unit_normalized: precio_total / 20
   - "Caja 10kg tomate" → quantity: 10, unit: "kg", pack_info: "caja 10kg", cost_per_unit_normalized: precio_total / 10

2) Unidades canónicas que DEBES usar:
   - "kg" para peso (convierte gramos: 500g → 0.5 kg)
   - "L" para líquidos (convierte ml: 500ml → 0.5 L)
   - "ud" para unidades sueltas (huevos, piezas, botes individuales)
   - NUNCA uses "caja", "pack" o "bulto" en el campo unit → eso va a pack_info

3) Coste por unidad normalizada:
   - cost_per_unit_normalized = total_price / quantity (en unidad canónica)
   - Ejemplo: caja 10kg a €25 → unit_price_original=25/caja, quantity=10, unit="kg", cost_per_unit_normalized=2.50

4) Proveedor: extráelo del encabezado de la factura (empresa emisora), no del cliente. Si ves CIF/NIF cerca, el proveedor es quien emite.

5) Fecha: formato YYYY-MM-DD siempre.

6) Si un campo no aparece o es ilegible, usa null. NO inventes.

FORMATO DE SALIDA (solo JSON, sin texto adicional, sin markdown):

{
  "invoice_number": "string o null",
  "supplier": "string o null",
  "invoice_date": "YYYY-MM-DD o null",
  "items": [
    {
      "product_name": "string limpio y normalizado",
      "quantity": number,
      "unit": "kg | L | ud",
      "unit_price": number,
      "total_price": number,
      "pack_info": "string descriptivo o null (ej: 'caja 10kg', 'pack 6x1L')",
      "cost_per_unit_normalized": number
    }
  ]
}

Todos los números como decimales (no strings). Sé extremadamente preciso con las cantidades.`;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

// Normaliza el nombre del proveedor: elimina formas legales, colapsa espacios, title case.
// "FRUTAS JUAN S.L." → "Frutas Juan"  |  "makro s.a.u" → "Makro"
function normalizeSupplier(name) {
  if (!name || typeof name !== 'string') return null;
  const cleaned = name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[,\s]*(s\.?\s*a\.?\s*u?\.?|s\.?\s*l\.?\s*u?\.?|s\.?\s*c(?:oop)?\.?|c\.?\s*b\.?|s\.?\s*a\.?\s*t\.?)\s*\.?\s*$/gi, '')
    .trim();
  if (!cleaned) return null;
  // Title case (primera letra de cada palabra en mayúscula)
  return cleaned.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// Modelo configurable por env var. Default: Opus 4.7 (máxima calidad y vision de alta
// resolución automática, ideal para facturas escaneadas). Alternativas:
// - 'claude-sonnet-4-6': suele bastar para facturas limpias y es notablemente más barato.
// - 'claude-opus-4-6': si quieres comparar comportamiento con la generación previa.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';

// Extrae el primer objeto JSON balanceado del texto, ignorando preámbulos del modelo
// y texto posterior. Tolera comillas escapadas y llaves dentro de strings.
function extractFirstJsonObject(text) {
  const stripped = text.replace(/```json\s*|\s*```/g, '');
  const start = stripped.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < stripped.length; i++) {
    const c = stripped[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return stripped.slice(start, i + 1);
    }
  }
  return null;
}

const cleanStr = (v, max) => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { base64File, base64Files, dry_run, confirmed } = req.body || {};

    let extracted;

    if (confirmed) {
      // Modo confirmado: el usuario revisó y editó los datos extraídos, saltar Claude
      if (typeof confirmed !== 'object' || Array.isArray(confirmed)) {
        return res.status(400).json({ error: 'confirmed debe ser un objeto' });
      }
      extracted = confirmed;
    } else {
      // Modo OCR: extraer desde imagen con Claude
      let file;
      if (Array.isArray(base64Files)) {
        if (base64Files.length !== 1) {
          return res.status(400).json({
            error: 'base64Files debe contener exactamente 1 imagen. Llama al endpoint una vez por factura.',
          });
        }
        file = base64Files[0];
      } else if (base64File) {
        file = base64File;
      } else {
        return res.status(400).json({ error: 'base64File requerido' });
      }

      const match = file.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: 'Formato base64 inválido' });
      }
      const mediaType = match[1];
      const base64Data = match[2];
      const isPdf = mediaType === 'application/pdf';

      const contentBlocks = [
        {
          type: isPdf ? 'document' : 'image',
          source: { type: 'base64', media_type: mediaType, data: base64Data },
        },
        { type: 'text', text: EXTRACTION_PROMPT },
      ];

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada' });
      }

      let anthropicResponse;
      try {
        anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: ANTHROPIC_MODEL,
            max_tokens: 8000,
            messages: [{ role: 'user', content: contentBlocks }],
          }),
          signal: AbortSignal.timeout(60000),
        });
      } catch (fetchErr) {
        if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
          return res.status(504).json({
            error: 'Anthropic tardó más de 45s en responder. Reintenta o prueba con menos páginas.',
          });
        }
        throw fetchErr;
      }

      if (!anthropicResponse.ok) {
        const errText = await anthropicResponse.text();
        console.error('Error Anthropic:', errText);
        return res.status(500).json({
          error: `Error de Anthropic: ${anthropicResponse.status}`,
          detail: errText,
        });
      }

      const anthropicData = await anthropicResponse.json();
      const textBlock = anthropicData.content?.find((c) => c.type === 'text');

      if (!textBlock || !textBlock.text) {
        throw new Error('Respuesta inesperada del modelo');
      }

      const jsonStr = extractFirstJsonObject(textBlock.text);
      if (!jsonStr) {
        console.error('No se encontró JSON en respuesta del modelo:', textBlock.text);
        return res.status(500).json({ error: 'La IA no devolvió un JSON válido' });
      }
      try {
        extracted = JSON.parse(jsonStr);
      } catch (e) {
        console.error('JSON inválido del modelo:', textBlock.text);
        return res.status(500).json({ error: 'La IA no devolvió un JSON válido' });
      }

      // dry_run: devolver datos extraídos sin guardar nada en BD
      if (dry_run) {
        return res.status(200).json({
          dry_run: true,
          extracted: {
            invoice_number: extracted.invoice_number || null,
            supplier: normalizeSupplier(extracted.supplier),
            invoice_date: extracted.invoice_date || null,
            items: (extracted.items || []).map((it) => ({
              product_name: cleanStr(it.product_name, 200),
              quantity: it.quantity ?? null,
              unit: cleanStr(it.unit, 20),
              unit_price: it.unit_price ?? null,
              total_price: it.total_price ?? null,
              pack_info: cleanStr(it.pack_info, 100),
              cost_per_unit_normalized: it.cost_per_unit_normalized ?? it.unit_price ?? null,
            })),
          },
        });
      }
    }

    // --- Guardar en BD (modo normal y modo confirmado) ---

    const supabase = getAdminClient();
    const supplierName = normalizeSupplier(extracted.supplier);

    // 1. Guardar factura
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        supplier: supplierName,
        invoice_date: extracted.invoice_date,
        invoice_number: extracted.invoice_number,
        status: 'processed',
      })
      .select()
      .single();

    if (invErr) {
      console.error('Error insertando invoice:', invErr);
      return res.status(500).json({ error: invErr.message });
    }

    // 2. Guardar items de la factura (con los nuevos campos normalizados).
    // Sanitizamos los strings devueltos por el modelo para evitar que un PDF
    // adversario o un OCR raro inyecte cadenas absurdamente largas.
    const itemsToInsert = (extracted.items || []).map((it) => ({
      invoice_id: invoice.id,
      product_name: cleanStr(it.product_name, 200),
      quantity: it.quantity,
      unit: cleanStr(it.unit, 20),
      unit_price: it.unit_price,
      total_price: it.total_price,
      pack_info: cleanStr(it.pack_info, 100),
      cost_per_unit_normalized: it.cost_per_unit_normalized || it.unit_price,
    }));

    let savedItems = [];
    if (itemsToInsert.length > 0) {
      const { data: items, error: itemsErr } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert)
        .select();

      if (itemsErr) {
        console.error('Error insertando items:', itemsErr);
      } else {
        savedItems = items || [];
      }
    }

    // 3. Actualizar productos y generar alertas por cambios de precio
    const generatedAlerts = [];
    const affectedRecipeIds = new Set();
    const costDeltaAlertedRecipeIds = new Set();

    for (const item of extracted.items || []) {
      const productName = cleanStr(item.product_name, 200);
      if (!productName || item.cost_per_unit_normalized == null) continue;

      const cleanUnit = cleanStr(item.unit, 20);
      const productSupplier = supplierName;
      const normalized = productName.toLowerCase();
      const newPrice = parseFloat(item.cost_per_unit_normalized);

      // Transacción atómica: SELECT FOR UPDATE evita que dos facturas concurrentes
      // lean el mismo precio viejo y generen alertas/historial duplicados.
      let productId = null;
      let prevPrice = null;

      const pgClient = await pool.connect();
      try {
        await pgClient.query('BEGIN');

        const { rows: [existing] } = await pgClient.query(
          `SELECT id, current_price FROM products
           WHERE name_normalized = $1 AND supplier IS NOT DISTINCT FROM $2
           FOR UPDATE`,
          [normalized, productSupplier]
        );

        const { rows: [upserted] } = await pgClient.query(
          `INSERT INTO products (name, unit, current_price, supplier)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (name_normalized, supplier) DO UPDATE
             SET name = EXCLUDED.name,
                 unit = EXCLUDED.unit,
                 current_price = EXCLUDED.current_price
           RETURNING id`,
          [productName, cleanUnit, newPrice, productSupplier]
        );

        productId = upserted.id;
        prevPrice = existing ? parseFloat(existing.current_price) : null;
        const priceChanged = prevPrice === null || prevPrice !== newPrice;

        if (priceChanged) {
          await pgClient.query(
            'INSERT INTO product_prices (product_id, price) VALUES ($1, $2)',
            [productId, newPrice]
          );
        }

        await pgClient.query('COMMIT');
      } catch (txErr) {
        await pgClient.query('ROLLBACK');
        console.error('Error updating product:', txErr);
        continue;
      } finally {
        pgClient.release();
      }

      if (prevPrice !== null) {
        const oldPrice = prevPrice;
        if (oldPrice > 0) {
          const change = ((newPrice - oldPrice) / oldPrice) * 100;
          if (Math.abs(change) >= 10) {
            const severity = Math.abs(change) >= 20 ? 'high' : 'medium';
            const direction = change > 0 ? 'subido' : 'bajado';
            const message = `${productName} ha ${direction} un ${Math.abs(change).toFixed(1)}% (de €${oldPrice.toFixed(2)} a €${newPrice.toFixed(2)}/${cleanUnit || ''})`;

            const { data: alert } = await supabase
              .from('alerts')
              .insert({
                product_id: productId,
                message,
                severity,
                read: false,
              })
              .select()
              .single();

            if (alert) generatedAlerts.push(alert);

            // Alertas independientes por cada plato que use este ingrediente
            const { data: affectedIngredients } = await supabase
              .from('recipe_ingredients')
              .select('quantity, recipes(id, name)')
              .eq('product_id', productId);

            for (const ri of affectedIngredients || []) {
              if (!ri.recipes) continue;
              affectedRecipeIds.add(ri.recipes.id);
              if (costDeltaAlertedRecipeIds.has(ri.recipes.id)) continue;
              costDeltaAlertedRecipeIds.add(ri.recipes.id);
              const costDelta = parseFloat(ri.quantity || 0) * (newPrice - oldPrice);
              const recipeVerb = change > 0 ? 'encarece' : 'abarata';
              const priceMovement = change > 0 ? 'alza' : 'descenso';
              const sign = change > 0 ? '+' : '-';
              const recipeMessage = `'${ri.recipes.name}' se ${recipeVerb} ~€${Math.abs(costDelta).toFixed(2)} por el ${priceMovement} de ${productName} (${sign}${Math.abs(change).toFixed(1)}%)`;

              const { data: recipeAlert } = await supabase
                .from('alerts')
                .insert({
                  recipe_id: ri.recipes.id,
                  message: recipeMessage,
                  severity,
                  read: false,
                })
                .select()
                .single();

              if (recipeAlert) generatedAlerts.push(recipeAlert);
            }
          }
        }
      }
    }

    // 4. Alertas de food cost: recalcular % real de cada plato afectado
    for (const recipeId of affectedRecipeIds) {
      const { data: recipe } = await supabase
        .from('recipes')
        .select('id, name, sale_price, target_food_cost_percentage')
        .eq('id', recipeId)
        .single();

      if (!recipe || !parseFloat(recipe.sale_price || 0)) continue;

      const { data: ingredients } = await supabase
        .from('recipe_ingredients')
        .select('quantity, products ( current_price )')
        .eq('recipe_id', recipeId);

      const totalCost = (ingredients || []).reduce(
        (sum, ri) => sum + parseFloat(ri.quantity || 0) * parseFloat(ri.products?.current_price || 0),
        0
      );
      const salePrice = parseFloat(recipe.sale_price);
      const actualPct = (totalCost / salePrice) * 100;
      const targetPct = parseFloat(recipe.target_food_cost_percentage || 35);

      if (actualPct > targetPct) {
        const severity = actualPct - targetPct >= 10 ? 'high' : 'medium';
        const message = `'${recipe.name}' supera el objetivo de food cost: ${actualPct.toFixed(1)}% actual vs ${targetPct.toFixed(0)}% objetivo`;

        const { data: fcAlert } = await supabase
          .from('alerts')
          .insert({ recipe_id: recipeId, message, severity, read: false })
          .select()
          .single();

        if (fcAlert) generatedAlerts.push(fcAlert);
      }
    }

    return res.status(200).json({
      success: true,
      invoice_data: {
        invoice_number: extracted.invoice_number,
        supplier: extracted.supplier,
        invoice_date: extracted.invoice_date,
      },
      saved_items: savedItems.map((it) => ({
        product_name: it.product_name,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
        total_amount: it.total_price,
        pack_info: it.pack_info,
      })),
      alerts: generatedAlerts.map((a) => ({
        id: a.id,
        message: a.message,
      })),
    });
  } catch (err) {
    console.error('Error processing invoice:', err);
    return res.status(500).json({ error: err.message || 'Error procesando factura' });
  }
}

// 30 req/h por IP + Origin de la app + secreto opcional (cuando se active).
export default compose(
  rateLimit({ limit: 30, windowMs: 60 * 60 * 1000 }),
  requireSameOrigin,
  requireAuth,
)(handler);

// api/invoices/process.js
import { getAdminClient } from '../_lib/supabase.js';

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
      sizeLimit: '10mb',
    },
  },
};

// Modelo configurable por env var. Default: Opus 4.5 (más preciso que Sonnet para OCR complejo).
// Puedes probar 'claude-opus-4-7' para máxima calidad o volver a 'claude-sonnet-4-5' si hay límite de coste.
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-5';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { base64File } = req.body || {};

    if (!base64File) {
      return res.status(400).json({ error: 'base64File requerido' });
    }

    const match = base64File.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Formato base64 inválido' });
    }
    const mediaType = match[1];
    const base64Data = match[2];

    const isPdf = mediaType === 'application/pdf';
    const sourceType = isPdf ? 'document' : 'image';

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada' });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: sourceType,
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              { type: 'text', text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    });

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

    let extracted;
    try {
      const cleaned = textBlock.text.replace(/```json\s*|\s*```/g, '').trim();
      extracted = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON inválido del modelo:', textBlock.text);
      return res.status(500).json({ error: 'La IA no devolvió un JSON válido' });
    }

    const supabase = getAdminClient();

    // 1. Guardar factura
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        supplier: extracted.supplier,
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

    // 2. Guardar items de la factura (con los nuevos campos normalizados)
    const itemsToInsert = (extracted.items || []).map((it) => ({
      invoice_id: invoice.id,
      product_name: it.product_name,
      quantity: it.quantity,
      unit: it.unit,
      unit_price: it.unit_price,
      total_price: it.total_price,
      pack_info: it.pack_info || null,
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

    for (const item of extracted.items || []) {
      if (!item.product_name || item.cost_per_unit_normalized == null) continue;

      const { data: existing } = await supabase
        .from('products')
        .select('id, current_price, supplier')
        .ilike('name', item.product_name)
        .maybeSingle();

      // Usamos el coste normalizado (€/unidad base) para comparar precios de forma justa
      const newPrice = parseFloat(item.cost_per_unit_normalized);

      if (existing) {
        const oldPrice = parseFloat(existing.current_price || 0);

        // Actualizar producto, incluyendo supplier si no lo tenía
        const updateData = { current_price: newPrice };
        if (!existing.supplier && extracted.supplier) {
          updateData.supplier = extracted.supplier;
        }

        await supabase
          .from('products')
          .update(updateData)
          .eq('id', existing.id);

        await supabase.from('product_prices').insert({
          product_id: existing.id,
          price: newPrice,
        });

        if (oldPrice > 0) {
          const change = ((newPrice - oldPrice) / oldPrice) * 100;
          if (Math.abs(change) >= 10) {
            const severity = Math.abs(change) >= 20 ? 'high' : 'medium';
            const direction = change > 0 ? 'subido' : 'bajado';
            const message = `${item.product_name} ha ${direction} un ${Math.abs(change).toFixed(1)}% (de €${oldPrice.toFixed(2)} a €${newPrice.toFixed(2)}/${item.unit})`;

            const { data: alert } = await supabase
              .from('alerts')
              .insert({
                product_id: existing.id,
                message,
                severity,
                read: false,
              })
              .select()
              .single();

            if (alert) generatedAlerts.push(alert);
          }
        }
      } else {
        // Producto nuevo → asociar al proveedor de esta factura
        const { data: newProduct } = await supabase
          .from('products')
          .insert({
            name: item.product_name,
            unit: item.unit,
            current_price: newPrice,
            supplier: extracted.supplier,
          })
          .select()
          .single();

        if (newProduct) {
          await supabase.from('product_prices').insert({
            product_id: newProduct.id,
            price: newPrice,
          });
        }
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

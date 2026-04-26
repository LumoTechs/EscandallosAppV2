// api/products/[id]
// GET    → producto + change_percentage + used_in_recipes_count
// PATCH  → actualizar name | current_price | unit (si cambia precio, también log en product_prices)
// DELETE → borrar producto (bloqueado si está usado en alguna receta)

import { getAdminClient } from '../../_lib/supabase.js';
import { requireAuth } from '../../_lib/auth.js';

const ALLOWED_UNITS = new Set(['kg', 'L', 'ud']);

async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'id requerido' });
  }

  const supabase = getAdminClient();

  if (req.method === 'GET') {
    return handleGet(supabase, id, res);
  }
  if (req.method === 'PATCH') {
    return handlePatch(supabase, id, req.body || {}, res);
  }
  if (req.method === 'DELETE') {
    return handleDelete(supabase, id, res);
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

async function handleGet(supabase, id, res) {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, unit, current_price, supplier, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching product:', error);
      return res.status(500).json({ error: error.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Últimos 2 precios para change_percentage
    const { data: lastPrices } = await supabase
      .from('product_prices')
      .select('price')
      .eq('product_id', id)
      .order('created_at', { ascending: false })
      .limit(2);

    let change_percentage = null;
    if (lastPrices && lastPrices.length === 2) {
      const curr = parseFloat(lastPrices[0].price);
      const prev = parseFloat(lastPrices[1].price);
      if (prev > 0) {
        change_percentage = ((curr - prev) / prev) * 100;
      }
    }

    // Recetas que usan este producto
    const { count: usedCount } = await supabase
      .from('recipe_ingredients')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id);

    return res.status(200).json({
      product: {
        id: product.id,
        name: product.name,
        unit: product.unit,
        current_price: product.current_price,
        supplier: product.supplier,
        last_updated: product.created_at,
        change_percentage,
        used_in_recipes_count: usedCount || 0,
      },
    });
  } catch (err) {
    console.error('Unexpected error in GET product:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function handlePatch(supabase, id, body, res) {
  try {
    const allowed = {};
    if (typeof body.name === 'string' && body.name.trim()) {
      allowed.name = body.name.trim();
    }
    if (body.current_price !== undefined) {
      const n = parseFloat(body.current_price);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: 'current_price inválido' });
      }
      allowed.current_price = n;
    }
    if (typeof body.unit === 'string') {
      const u = body.unit.trim();
      if (u && !ALLOWED_UNITS.has(u)) {
        return res.status(400).json({ error: `unit debe ser uno de: ${[...ALLOWED_UNITS].join(', ')}` });
      }
      allowed.unit = u || null;
    }

    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ error: 'Sin campos válidos para actualizar' });
    }

    // Si va a cambiar el precio, leer el actual antes para decidir si logueamos
    let priceChanged = false;
    if (allowed.current_price !== undefined) {
      const { data: prev } = await supabase
        .from('products')
        .select('current_price')
        .eq('id', id)
        .maybeSingle();
      const prevPrice = prev ? parseFloat(prev.current_price || 0) : null;
      priceChanged = prevPrice !== allowed.current_price;
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update(allowed)
      .eq('id', id)
      .select('id, name, unit, current_price, supplier, created_at')
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({ error: error.message });
    }

    if (priceChanged) {
      const { error: priceErr } = await supabase
        .from('product_prices')
        .insert({ product_id: id, price: allowed.current_price });
      if (priceErr) {
        console.error('Error logging price history:', priceErr);
        // No bloqueamos: el producto ya está actualizado
      }
    }

    return res.status(200).json({
      product: {
        id: updated.id,
        name: updated.name,
        unit: updated.unit,
        current_price: updated.current_price,
        supplier: updated.supplier,
        last_updated: updated.created_at,
      },
    });
  } catch (err) {
    console.error('Unexpected error in PATCH product:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function handleDelete(supabase, id, res) {
  try {
    const { count: usedCount } = await supabase
      .from('recipe_ingredients')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id);

    if ((usedCount || 0) > 0) {
      return res.status(409).json({
        error: `Este producto se usa en ${usedCount} receta${usedCount === 1 ? '' : 's'}. Elimínalo primero de las recetas.`,
      });
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      // FK ON DELETE RESTRICT en recipe_ingredients: si una receta lo añadió
      // entre el check y el delete, Postgres rechaza con código 23503.
      if (error.code === '23503') {
        return res.status(409).json({
          error: 'Este producto está en uso por una receta. Elimínalo primero de las recetas.',
        });
      }
      console.error('Error deleting product:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Unexpected error in DELETE product:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default requireAuth(handler);

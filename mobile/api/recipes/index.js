// api/recipes/index.js
// GET  → lista recetas con coste total y food_cost real (calculado en JS sobre joins)
// POST → crea receta + ingredientes (pseudo-tx: si fallan los items, borra la receta)

import { getUserClient } from '../_lib/supabase.js';
import { requireAuth, rateLimit, compose } from '../_lib/auth.js';

async function listRecipes(req, res, supabase) {
  // Trae cada receta con sus ingredientes y el current_price del producto
  // para calcular total_cost y food_cost en JS. RLS filtra por restaurant.
  const page = Math.max(0, parseInt(req.query.page || '0', 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const from = page * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('recipes')
    .select(`
      id, name, sale_price, category, target_food_cost_percentage, image_url, created_at,
      recipe_ingredients ( quantity, products ( current_price ) )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching recipes:', error);
    return res.status(500).json({ error: error.message });
  }

  const enriched = (data || []).map((r) => {
    const ingredients = r.recipe_ingredients || [];
    const totalCost = ingredients.reduce(
      (sum, ri) => sum + parseFloat(ri.quantity || 0) * parseFloat(ri.products?.current_price || 0),
      0
    );
    const salePrice = parseFloat(r.sale_price || 0);
    const actualFoodCost = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;

    return {
      id: r.id,
      name: r.name,
      sale_price: r.sale_price,
      category: r.category || null,
      target_food_cost_percentage: r.target_food_cost_percentage,
      actual_food_cost_percentage: actualFoodCost.toFixed(2),
      total_cost: totalCost.toFixed(2),
      ingredient_count: ingredients.length,
      image_url: r.image_url || null,
      created_at: r.created_at,
    };
  });

  return res.status(200).json({ recipes: enriched, total: count ?? enriched.length, page, limit });
}

async function createRecipe(req, res, supabase) {
  const { name, sale_price, category, ingredients, target_food_cost_percentage } = req.body || {};

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name es requerido' });
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'ingredients es requerido' });
  }

  const salePriceNum = parseFloat(sale_price);
  if (!Number.isFinite(salePriceNum) || salePriceNum <= 0) {
    return res.status(400).json({ error: 'sale_price debe ser un número mayor que 0' });
  }

  let targetPct = 35;
  if (target_food_cost_percentage !== undefined && target_food_cost_percentage !== null) {
    const n = parseFloat(target_food_cost_percentage);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return res.status(400).json({ error: 'target_food_cost_percentage debe estar entre 0 y 100' });
    }
    targetPct = n;
  }

  const cleanIngredients = [];
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    if (!ing || typeof ing.product_id !== 'string' || !ing.product_id.trim()) {
      return res.status(400).json({ error: `ingredients[${i}].product_id requerido` });
    }
    const qty = parseFloat(ing.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: `ingredients[${i}].quantity debe ser un número mayor que 0` });
    }
    cleanIngredients.push({
      product_id: ing.product_id.trim(),
      quantity: qty,
      unit: typeof ing.unit === 'string' && ing.unit.trim() ? ing.unit.trim() : null,
    });
  }

  // Pseudo-transacción: si el insert de ingredientes falla, borrar la receta.
  // RLS bloquea acceso cross-tenant, así que un product_id de otro tenant fallará por FK.
  const { data: recipe, error: recipeErr } = await supabase
    .from('recipes')
    .insert({
      name: name.trim(),
      sale_price: salePriceNum,
      category: category || null,
      target_food_cost_percentage: targetPct,
    })
    .select('id')
    .single();

  if (recipeErr) {
    console.error('Error creando recipe:', recipeErr);
    return res.status(500).json({ error: recipeErr.message });
  }

  const itemsToInsert = cleanIngredients.map((ing) => ({
    recipe_id: recipe.id,
    product_id: ing.product_id,
    quantity: ing.quantity,
    unit: ing.unit,
  }));

  const { error: itemsErr } = await supabase.from('recipe_ingredients').insert(itemsToInsert);

  if (itemsErr) {
    // Rollback: borrar la receta para no dejar huérfanos. RLS permite el delete (mismo tenant).
    await supabase.from('recipes').delete().eq('id', recipe.id);
    if (itemsErr.code === '23503') {
      return res.status(400).json({ error: 'Algún product_id no existe o pertenece a otro restaurante' });
    }
    if (itemsErr.code === '22P02') {
      return res.status(400).json({ error: 'product_id con formato inválido' });
    }
    console.error('Error creando recipe_ingredients (rollback):', itemsErr);
    return res.status(500).json({ error: itemsErr.message });
  }

  return res.status(200).json({ success: true, recipe_id: recipe.id });
}

async function handler(req, res) {
  const supabase = getUserClient(req.headers.authorization);
  if (req.method === 'GET') return listRecipes(req, res, supabase);
  if (req.method === 'POST') return createRecipe(req, res, supabase);
  return res.status(405).json({ error: 'Método no permitido' });
}

export default compose(rateLimit({ limit: 200, windowMs: 60 * 60 * 1000 }), requireAuth)(handler);

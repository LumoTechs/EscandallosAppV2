// api/recipes/create.js
import { getAdminClient } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { name, sale_price, category, ingredients } = req.body || {};

    if (!name || !sale_price || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'name, sale_price e ingredients son requeridos' });
    }

    const supabase = getAdminClient();

    const { data: recipe, error: recErr } = await supabase
      .from('recipes')
      .insert({
        name,
        sale_price: parseFloat(sale_price),
        category: category || null,
        target_food_cost_percentage: 35,
      })
      .select()
      .single();

    if (recErr) {
      console.error('Error creando receta:', recErr);
      return res.status(500).json({ error: recErr.message });
    }

    const ingredientsToInsert = ingredients.map((i) => ({
      recipe_id: recipe.id,
      product_id: i.product_id,
      quantity: parseFloat(i.quantity),
      unit: i.unit || null,
    }));

    const { error: ingErr } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientsToInsert);

    if (ingErr) {
      console.error('Error insertando ingredientes:', ingErr);
      // rollback manual
      await supabase.from('recipes').delete().eq('id', recipe.id);
      return res.status(500).json({ error: ingErr.message });
    }

    return res.status(200).json({ success: true, recipe_id: recipe.id });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

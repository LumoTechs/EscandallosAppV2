// api/recipes/list.js
import { getAdminClient } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const supabase = getAdminClient();

    const { data: recipes, error } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        sale_price,
        target_food_cost_percentage,
        created_at,
        recipe_ingredients (
          quantity,
          unit,
          products ( id, current_price )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipes:', error);
      return res.status(500).json({ error: error.message });
    }

    // Calculamos food cost real para cada receta
    const enriched = (recipes || []).map((r) => {
      let totalCost = 0;

      for (const ing of r.recipe_ingredients || []) {
        const price = parseFloat(ing.products?.current_price || 0);
        const qty = parseFloat(ing.quantity || 0);
        totalCost += price * qty;
      }

      const salePrice = parseFloat(r.sale_price || 0);
      const actualFoodCost = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;

      return {
        id: r.id,
        name: r.name,
        sale_price: r.sale_price,
        target_food_cost_percentage: r.target_food_cost_percentage,
        actual_food_cost_percentage: actualFoodCost.toFixed(2),
        total_cost: totalCost.toFixed(2),
        created_at: r.created_at,
      };
    });

    return res.status(200).json({ recipes: enriched });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

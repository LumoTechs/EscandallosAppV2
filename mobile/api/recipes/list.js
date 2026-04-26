// api/recipes/list.js
import { getAdminClient } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const supabase = getAdminClient();

    const { data: raw, error } = await supabase.rpc('list_recipes_full');

    if (error) {
      console.error('Error fetching recipes:', error);
      return res.status(500).json({ error: error.message });
    }

    const enriched = (raw || []).map((r) => {
      const salePrice = parseFloat(r.sale_price || 0);
      const totalCost = parseFloat(r.total_cost || 0);
      const actualFoodCost = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;

      return {
        id: r.id,
        name: r.name,
        sale_price: r.sale_price,
        category: r.category || null,
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

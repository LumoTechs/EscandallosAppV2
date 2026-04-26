import { query } from '../_lib/db.js';
import { requireSharedSecret } from '../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const rows = await query(`
      SELECT
        r.id,
        r.name,
        r.sale_price,
        r.category,
        r.target_food_cost_percentage,
        r.created_at,
        COALESCE(SUM(ri.quantity * p.current_price), 0) AS total_cost,
        COUNT(ri.id) AS ingredient_count
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
      LEFT JOIN products p ON p.id = ri.product_id
      GROUP BY r.id, r.name, r.sale_price, r.category,
               r.target_food_cost_percentage, r.created_at
      ORDER BY r.created_at DESC
    `);

    const enriched = rows.map((r) => {
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
        ingredient_count: Number(r.ingredient_count) || 0,
        created_at: r.created_at,
      };
    });

    return res.status(200).json({ recipes: enriched });
  } catch (err) {
    console.error('Error fetching recipes:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default requireSharedSecret(handler);

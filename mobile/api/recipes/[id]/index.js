// api/recipes/[id]
// GET → receta + ingredientes detallados (con producto, precio actual, subtotal)
//        + total_cost, margin, food_cost_percentage

import { query } from '../../_lib/db.js';
import { requireSharedSecret } from '../../_lib/auth.js';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'id requerido' });
  }

  try {
    const recipeRows = await query(
      `SELECT id, name, sale_price, category, target_food_cost_percentage, created_at
         FROM recipes
        WHERE id = $1`,
      [id]
    );

    if (recipeRows.length === 0) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    const r = recipeRows[0];

    const ingredients = await query(
      `SELECT
          ri.id,
          ri.product_id,
          ri.quantity,
          ri.unit AS recipe_unit,
          p.name AS product_name,
          p.unit AS product_unit,
          p.current_price,
          (ri.quantity * p.current_price) AS line_cost
         FROM recipe_ingredients ri
         JOIN products p ON p.id = ri.product_id
        WHERE ri.recipe_id = $1
        ORDER BY p.name ASC`,
      [id]
    );

    const totalCost = ingredients.reduce(
      (sum, i) => sum + parseFloat(i.line_cost || 0),
      0
    );
    const salePrice = parseFloat(r.sale_price || 0);
    const margin = salePrice - totalCost;
    const foodCostPct = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;

    return res.status(200).json({
      recipe: {
        id: r.id,
        name: r.name,
        sale_price: r.sale_price,
        category: r.category || null,
        target_food_cost_percentage: r.target_food_cost_percentage,
        created_at: r.created_at,
        total_cost: totalCost.toFixed(2),
        margin: margin.toFixed(2),
        actual_food_cost_percentage: foodCostPct.toFixed(2),
        ingredients: ingredients.map((i) => ({
          id: i.id,
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: parseFloat(i.quantity || 0),
          unit: i.recipe_unit || i.product_unit || null,
          current_price: parseFloat(i.current_price || 0),
          line_cost: parseFloat(i.line_cost || 0),
        })),
      },
    });
  } catch (err) {
    console.error('Error fetching recipe detail:', err);
    return res.status(500).json({ error: err.message });
  }
}

export default requireSharedSecret(handler);

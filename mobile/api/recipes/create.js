// api/recipes/create.js
import { pool } from '../_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { name, sale_price, category, ingredients, target_food_cost_percentage } = req.body || {};

    if (!name || !sale_price || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'name, sale_price e ingredients son requeridos' });
    }

    let targetPct = 35;
    if (target_food_cost_percentage !== undefined && target_food_cost_percentage !== null) {
      const n = parseFloat(target_food_cost_percentage);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        return res.status(400).json({ error: 'target_food_cost_percentage debe estar entre 0 y 100' });
      }
      targetPct = n;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const recipeRes = await client.query(
        `INSERT INTO recipes (name, sale_price, category, target_food_cost_percentage)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [name, parseFloat(sale_price), category || null, targetPct]
      );
      const recipeId = recipeRes.rows[0].id;

      const placeholders = ingredients
        .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`)
        .join(', ');
      const params = [recipeId];
      for (const ing of ingredients) {
        params.push(ing.product_id, parseFloat(ing.quantity), ing.unit || null);
      }

      await client.query(
        `INSERT INTO recipe_ingredients (recipe_id, product_id, quantity, unit)
         VALUES ${placeholders}`,
        params
      );

      await client.query('COMMIT');
      return res.status(200).json({ success: true, recipe_id: recipeId });
    } catch (txErr) {
      await client.query('ROLLBACK');
      console.error('Error creando receta (rollback):', txErr);
      return res.status(500).json({ error: txErr.message });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
}

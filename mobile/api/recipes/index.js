import { query, pool } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';

async function listRecipes(req, res) {
  try {
    const rows = await query(`
      SELECT
        r.id,
        r.name,
        r.sale_price,
        r.category,
        r.target_food_cost_percentage,
        r.image_url,
        r.created_at,
        COALESCE(SUM(ri.quantity * p.current_price), 0) AS total_cost,
        COUNT(ri.id) AS ingredient_count
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
      LEFT JOIN products p ON p.id = ri.product_id
      GROUP BY r.id, r.name, r.sale_price, r.category,
               r.target_food_cost_percentage, r.image_url, r.created_at
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
        image_url: r.image_url || null,
        created_at: r.created_at,
      };
    });

    return res.status(200).json({ recipes: enriched });
  } catch (err) {
    console.error('Error fetching recipes:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function createRecipe(req, res) {
  try {
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

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const recipeRes = await client.query(
        `INSERT INTO recipes (name, sale_price, category, target_food_cost_percentage)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [name.trim(), salePriceNum, category || null, targetPct]
      );
      const recipeId = recipeRes.rows[0].id;

      const placeholders = cleanIngredients
        .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`)
        .join(', ');
      const params = [recipeId];
      for (const ing of cleanIngredients) {
        params.push(ing.product_id, ing.quantity, ing.unit);
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
      if (txErr.code === '23503') {
        return res.status(400).json({ error: 'Algún product_id no existe' });
      }
      if (txErr.code === '22P02') {
        return res.status(400).json({ error: 'product_id con formato inválido' });
      }
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

async function handler(req, res) {
  if (req.method === 'GET')  return listRecipes(req, res);
  if (req.method === 'POST') return createRecipe(req, res);
  return res.status(405).json({ error: 'Método no permitido' });
}

export default requireAuth(handler);

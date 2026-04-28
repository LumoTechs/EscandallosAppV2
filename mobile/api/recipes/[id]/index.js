// api/recipes/[id]
// GET  → receta + ingredientes detallados (con producto, precio actual, subtotal)
//        + total_cost, margin, food_cost_percentage
// POST → sube imagen del plato (base64Image en el body) al bucket recipe-images
//        y actualiza recipes.image_url. Devuelve { image_url }.

import { query } from '../../_lib/db.js';
import { requireAuth } from '../../_lib/auth.js';
import { getAdminClient } from '../../_lib/supabase.js';

async function getRecipe(req, res) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'id requerido' });
  }

  try {
    const recipeRows = await query(
      `SELECT id, name, sale_price, category, target_food_cost_percentage, image_url, created_at
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
        image_url: r.image_url || null,
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

async function uploadImage(req, res) {
  const { id } = req.query;
  const { base64Image, mimeType = 'image/jpeg' } = req.body || {};

  if (!id)          return res.status(400).json({ error: 'id requerido' });
  if (!base64Image) return res.status(400).json({ error: 'base64Image requerido' });

  try {
    const supabase = getAdminClient();

    await supabase.storage.createBucket('recipe-images', {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });

    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const ext  = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const path = `${id}/photo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(path);
    const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await query('UPDATE recipes SET image_url = $1 WHERE id = $2', [urlData.publicUrl, id]);

    return res.status(200).json({ image_url: imageUrl });
  } catch (err) {
    console.error('Unexpected error uploading recipe image:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function handler(req, res) {
  if (req.method === 'GET')  return getRecipe(req, res);
  if (req.method === 'POST') return uploadImage(req, res);
  return res.status(405).json({ error: 'Método no permitido' });
}

export default requireAuth(handler);

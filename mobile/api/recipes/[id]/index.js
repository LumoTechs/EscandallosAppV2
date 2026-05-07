// api/recipes/[id]
// GET  → receta + ingredientes detallados (con producto, precio actual, subtotal)
// POST → sube imagen del plato (base64Image en el body) al bucket recipe-images
//        y actualiza recipes.image_url. Devuelve { image_url }.

import { getUserClient, getAdminClient } from '../../_lib/supabase.js';
import { requireAuth } from '../../_lib/auth.js';

async function getRecipe(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id requerido' });

  const supabase = getUserClient(req.headers.authorization);

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select(`
      id, name, sale_price, category, target_food_cost_percentage, image_url, created_at,
      recipe_ingredients (
        id, product_id, quantity, unit,
        products ( name, unit, current_price )
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching recipe detail:', error);
    return res.status(500).json({ error: error.message });
  }
  if (!recipe) {
    return res.status(404).json({ error: 'Receta no encontrada' });
  }

  const ingredients = (recipe.recipe_ingredients || [])
    .map((ri) => {
      const currentPrice = parseFloat(ri.products?.current_price || 0);
      const quantity = parseFloat(ri.quantity || 0);
      return {
        id: ri.id,
        product_id: ri.product_id,
        product_name: ri.products?.name || null,
        quantity,
        unit: ri.unit || ri.products?.unit || null,
        current_price: currentPrice,
        line_cost: quantity * currentPrice,
      };
    })
    .sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));

  const totalCost = ingredients.reduce((s, i) => s + i.line_cost, 0);
  const salePrice = parseFloat(recipe.sale_price || 0);
  const margin = salePrice - totalCost;
  const foodCostPct = salePrice > 0 ? (totalCost / salePrice) * 100 : 0;

  return res.status(200).json({
    recipe: {
      id: recipe.id,
      name: recipe.name,
      sale_price: recipe.sale_price,
      category: recipe.category || null,
      target_food_cost_percentage: recipe.target_food_cost_percentage,
      image_url: recipe.image_url || null,
      created_at: recipe.created_at,
      total_cost: totalCost.toFixed(2),
      margin: margin.toFixed(2),
      actual_food_cost_percentage: foodCostPct.toFixed(2),
      ingredients,
    },
  });
}

async function uploadImage(req, res) {
  const { id } = req.query;
  const { base64Image, mimeType = 'image/jpeg' } = req.body || {};

  if (!id) return res.status(400).json({ error: 'id requerido' });
  if (!base64Image) return res.status(400).json({ error: 'base64Image requerido' });

  // Verificación de pertenencia: el user-scoped client respeta RLS, así que si la receta
  // no es de su tenant, el SELECT devuelve null y devolvemos 404 antes de subir nada.
  const userSupabase = getUserClient(req.headers.authorization);
  const { data: own, error: ownErr } = await userSupabase
    .from('recipes')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (ownErr) return res.status(500).json({ error: ownErr.message });
  if (!own) return res.status(404).json({ error: 'Receta no encontrada' });

  // Storage requiere service_role para createBucket. El UPDATE final también pasa por
  // RLS via userSupabase para no permitir cambiar image_url de recetas ajenas.
  const adminSupabase = getAdminClient();

  await adminSupabase.storage.createBucket('recipe-images', {
    public: true,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });

  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const path = `${id}/photo.${ext}`;

  const { error: uploadError } = await adminSupabase.storage
    .from('recipe-images')
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return res.status(500).json({ error: uploadError.message });
  }

  const { data: urlData } = adminSupabase.storage.from('recipe-images').getPublicUrl(path);
  const imageUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { error: updErr } = await userSupabase
    .from('recipes')
    .update({ image_url: urlData.publicUrl })
    .eq('id', id);
  if (updErr) {
    console.error('Error updating image_url:', updErr);
    return res.status(500).json({ error: updErr.message });
  }

  return res.status(200).json({ image_url: imageUrl });
}

async function handler(req, res) {
  if (req.method === 'GET') return getRecipe(req, res);
  if (req.method === 'POST') return uploadImage(req, res);
  return res.status(405).json({ error: 'Método no permitido' });
}

export default requireAuth(handler);

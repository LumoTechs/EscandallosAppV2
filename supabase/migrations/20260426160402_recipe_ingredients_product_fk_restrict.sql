ALTER TABLE public.recipe_ingredients
  DROP CONSTRAINT recipe_ingredients_product_id_fkey;

ALTER TABLE public.recipe_ingredients
  ADD CONSTRAINT recipe_ingredients_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id)
  ON DELETE RESTRICT;

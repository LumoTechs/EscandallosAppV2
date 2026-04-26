# Supabase migrations

Migraciones SQL versionadas del proyecto. Aplicadas hasta:

| version          | name                                       |
|------------------|--------------------------------------------|
| 20260426142544   | add_unique_products_name_supplier          |
| 20260426160402   | recipe_ingredients_product_fk_restrict     |

Las migraciones nuevas se aplican vía Supabase MCP (`apply_migration`) desde el Mac principal y luego se vuelcan aquí. El otro PC no aplica migraciones — solo `git pull` para tener la copia.

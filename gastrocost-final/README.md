# 🍴 GastroCost

App de control de costes y escandallos para hostelería. OCR de facturas con Claude, gestión de productos por proveedor, escandallos con margen en tiempo real y alertas inteligentes de variación de precios.

## ✨ Features

- **Dashboard** con food cost medio, tendencias y alertas críticas
- **Escaneo de facturas** (foto / imagen / PDF) con OCR por Claude Opus
- **Productos agrupados por proveedor** con facturas escaneadas anidadas
- **Escandallos con margen € y food cost % en tiempo real** mientras añades ingredientes
- **Alertas inteligentes** cuando el precio de un ingrediente sube o baja ≥10%

## 🧱 Stack

- **Frontend:** Expo + React Native (web) + Expo Router + React Query
- **Backend:** Vercel serverless functions (`/api/*`)
- **DB:** Supabase (Postgres)
- **IA:** Anthropic Claude (Opus 4.5/4.7) para OCR

## 🚀 Puesta en marcha (5 pasos)

### 1. Clonar y subir a GitHub

```bash
git init
git add .
git commit -m "Initial GastroCost setup"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

### 2. Supabase

1. Crea un proyecto nuevo en [supabase.com](https://supabase.com)
2. Ve al **SQL Editor** y ejecuta `supabase/migration.sql` completo
3. Apunta estos valores (los necesitarás en el siguiente paso):
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (Settings > API) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Claude API Key

1. Ve a [console.anthropic.com](https://console.anthropic.com)
2. Genera una API key → `ANTHROPIC_API_KEY`

### 4. Vercel

1. En [vercel.com](https://vercel.com) → **Add New > Project**
2. Importa tu repo de GitHub
3. **Root Directory:** `mobile`
4. Framework Preset: **Other** (ya está configurado en `vercel.json`)
5. En **Environment Variables** añade:

   | Nombre | Valor |
   |---|---|
   | `EXPO_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJhb...` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhb...` |
   | `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
   | `ANTHROPIC_MODEL` | `claude-opus-4-5` *(opcional)* |

6. **Deploy** → listo.

### 5. Probar en local (opcional)

```bash
cd mobile
cp .env.example .env.local   # rellena con tus valores
npm install
npm start
```

Se abrirá en `http://localhost:8081`.

## 📁 Estructura

```
.
├── supabase/
│   └── migration.sql           ← ejecutar 1 vez en Supabase
└── mobile/                      ← raíz para Vercel
    ├── api/                     ← serverless functions
    │   ├── _lib/supabase.js    ← cliente admin de Supabase
    │   ├── invoices/process.js ← OCR con Claude Opus (prompt normalizador)
    │   ├── products/list.js    ← productos agrupados por proveedor
    │   ├── recipes/list.js     ← escandallos con food cost calculado
    │   ├── recipes/create.js   ← crear escandallo
    │   └── alerts/             ← list + mark-read
    └── src/app/
        ├── _layout.jsx
        └── (tabs)/
            ├── _layout.jsx     ← bottom nav (5 tabs)
            ├── index.jsx       ← Dashboard
            ├── upload.jsx      ← Procesar factura
            ├── products.jsx    ← Productos por proveedor
            ├── recipes.jsx     ← Escandallos
            └── alerts.jsx      ← Alertas
```

## 🎨 Tema

El diseño usa una paleta cálida consistente:

- Fondo: `#FFFDF9` (crema)
- Tinta: `#2B1D12` (marrón profundo)
- Primario: `#B2451C` (terracota)
- Acento: `#D98324` (ámbar)
- Tipografía títulos: Georgia (serif)

## 🤖 Elegir modelo de OCR

La variable `ANTHROPIC_MODEL` controla qué modelo analiza tus facturas:

| Modelo | Ventajas | Contras |
|---|---|---|
| `claude-opus-4-5` | Mejor precisión en facturas con cajas, packs, formatos mezclados. **Default recomendado.** | Más caro que Sonnet |
| `claude-opus-4-7` | El más nuevo. Soporta imágenes de alta resolución (mejor con fotos de móvil borrosas) | El más caro |
| `claude-sonnet-4-5` | Más rápido y barato | Menos preciso en facturas complejas |

El prompt del OCR está diseñado para **desagregar y normalizar** unidades automáticamente: si una factura pone "caja 10kg tomate a €25", el sistema guarda `quantity=10`, `unit=kg`, `pack_info="caja 10kg"`, y `cost_per_unit_normalized=2.50 €/kg`. Así las alertas de variación de precio comparan €/kg contra €/kg de forma justa entre facturas distintas.

## 🔄 Actualizar modelo OCR sin redeploy de código

En Vercel → Project Settings → Environment Variables → edita `ANTHROPIC_MODEL` → **Redeploy**. Sin tocar código.

## 📝 Licencia

Uso personal.

# EscandallosApp V2 — Guía para Claude

SaaS de escandallos para restaurantes. Producto B2B de **LumoTech** (Luis autónomo, marca tech).

## Contexto holding (no mezclar)
- Empresa: **LumoTech** (Luis autónomo NIF 79035115P, marca tech B2B SaaS).
- Producto: SaaS multi-tenant para restaurantes — gestión de escandallos, costes, márgenes.
- Repo: `LumoTechs/Escandallosappv2`.
- Colaboradora: **Rebeca (Viibecca)** — abre branches y avisa para mergear.
- ⚠️ **Datos LumoTech NO se mezclan con Ferlu ni Personal.** Cuenta Vercel/Supabase distinta.

## Stack
- **Frontend**: Next.js + Supabase JS.
- **Backend**: Supabase project LumoTech (Postgres + Auth + RLS multi-tenant).
- **Hosting**: Vercel team Lumo. ⚠️ **Hobby plan = máx 12 funciones serverless.** Vigilar al añadir APIs.
- **Pagos**: Stripe TEST + 3 promo codes.

## Estado actual (commit main `954cfb8` — 2026-05-07 noche)
- ✅ Auth + Stripe + dashboard + invoice detail + multi-tenant base.
- ✅ AI usage trackeado en tabla `ai_usage` (lo lee Centro Control Lumo).
- ✅ Multi-tenant fase 1 BD lista en Supabase LumoTech: `restaurants` + `restaurant_members` + `restaurant_id NOT NULL` en 8 tablas + 32 RLS policies + trigger auto-onboarding.
- ✅ Demo `11111111-1111-1111-1111-111111111111` para techslumo@gmail.com.

## Pendiente backend (urgente)
- **12 endpoints usan `service_role`** → migrar a `getUserClient(jwt)` para respetar RLS multi-tenant.
- **Setup wizard** restaurante (onboarding inicial).
- **E2E checkout Stripe** en TEST (verificar flujo completo con cada promo code).

## Backlog issues
- ✅ Hechos: #1-#11, #16-#23, #28, #31-#33, #35, #37.
- ⏳ Pendientes prioritarios: **#34** (pass admin), multi-tenant backend.
- ⏳ Suelto: #12-#15, #24-#27, #29-#30, #36, #38, #39.

## Stripe
- Stripe TEST + 3 promo codes activos.
- ⚠️ **Bug `PRUEBALUMO`**: `max_redemptions=1` configurado mal — primer usuario lo agota.
- E2E checkout pendiente para validar flujo completo.

## Auth
- Login solo con usuarios creados a mano (no self-signup público).
- Botón "Solicitar acceso" → WhatsApp Luis: **+34 647 523682**.

## Convenciones
- Multi-tenant siempre primero — toda query filtra por `restaurant_id`.
- RLS antes que filtrado en código — defense in depth.
- AI usage tracked → mantener registro en `ai_usage` para que Centro Control lo lea.
- Vercel Hobby cap 12 funcs → si vas a añadir API, mira si puedes hacerlo en page action o RSC primero.

## Modo Dios (Plan Maestro Global)
- Pre-flight obligatorio antes de tocar nada. Ver `~/.claude/SESSION_PLAYBOOK.md`.
- Modelo por defecto: **Sonnet 4.6** para implementar.
- **Haiku 4.5** para clasificar / parsear / decidir.
- **Opus 4.7** solo arquitectura crítica / decisión irreversible.
- Prompt caching obligatorio en system prompts >1K tokens.
- Tracking coste IA ya existente en `ai_usage` — mantener.

## MCPs disponibles
- `mcp__supabase-lumotech__*` — proyecto Supabase LumoTech.
- `mcp__github__*` — para PRs/issues en `LumoTechs/Escandallosappv2`.
- `mcp__stripe__*` — para gestión Stripe TEST.

## Visión futura (Plan Maestro)
- Fase 2 Plan Maestro: monorepo `lumo-monorepo` con `apps/escandallos`, `apps/centro-control`, `apps/autonomopro` + packages compartidos (`shared-types`, `shared-ai`, `shared-observability`).
- Fase 5 Plan Maestro: Centro Control Lumo se convierte en panel maestro del holding completo, lee `ai_usage` cross-app.
- Documentos canónicos: `~/Downloads/BLUEPRINT_MAESTRO_v2.pdf` + `~/Downloads/PLAN_MAESTRO_GLOBAL.pdf`.

## Para profundizar (topic-files)
- `~/.claude/projects/-Users-luis/memory/project_escandallos.md` — overview
- `~/.claude/projects/-Users-luis/memory/project_escandallos_multitenant.md` — multi-tenant
- `~/.claude/projects/-Users-luis/memory/project_escandallos_backlog.md` — backlog issues
- `~/.claude/projects/-Users-luis/memory/project_escandallos_stripe.md` — Stripe + promos
- `~/.claude/projects/-Users-luis/memory/project_escandallos_auth.md` — Auth
- `~/.claude/projects/-Users-luis/memory/project_escandallos_invoice_detail_merge.md` — merge invoice-detail
- `~/.claude/projects/-Users-luis/memory/collaborator_rebeca.md` — colaboradora

## Contacto operativo
- Luis (no a Álvaro) — Álvaro no participa en LumoTech.
- Soporte usuarios: WhatsApp +34 647 523682.

# Plan para Claude Code: Centro Control, soporte y monitorizacion de EscandallosAppV2

## Objetivo

Crear una capa de soporte y monitorizacion para EscandallosAppV2 que permita a LumoTech operar la app con usuarios reales:

- Ver actividad de restaurantes y usuarios.
- Detectar errores antes de que el cliente se queje.
- Gestionar tickets de soporte.
- Ver estado de Stripe, OCR/IA, uploads y APIs.
- Preparar la app para beta privada y posterior venta publica.

Importante: esto no debe convertirse en vigilancia invasiva. No se debe grabar pantalla ni contenido sensible innecesario. El objetivo es telemetria operativa, soporte y salud del producto.

## Contexto del proyecto

- Repo principal: `/Users/luis/Developer/EscandallosAppV2`
- App publica: `https://www.lumotech.app`
- Stack app: Expo Router / React Native Web / Vercel / Supabase / Stripe
- Supabase LumoTech: proyecto `alevfitmkzzgtmnihtkf`
- Centro Control existente: `/Users/luis/Developer/lumo-monorepo/apps/centro-control`
- Produccion Centro Control: `https://centro-control-lumo.vercel.app`

Regla de arquitectura:

- EscandallosAppV2 envia eventos, errores y tickets.
- Centro Control lee y administra esa informacion.
- La `service_role` solo puede vivir en backend/admin, nunca en frontend publico.

## Resultado esperado

Al final de la primera version deberia existir:

1. Base de datos con tablas para eventos, errores, tickets y salud.
2. Helpers en EscandallosAppV2 para registrar eventos y errores.
3. Boton o vista de soporte dentro de la app.
4. Pantalla admin en Centro Control para ver restaurantes, eventos, errores y tickets.
5. Reglas RLS claras.
6. Criterios de privacidad y retencion de datos.

## Fases recomendadas

### Fase 0 - Auditoria rapida antes de tocar codigo

Claude debe revisar:

- Rutas actuales de `mobile/src/app`.
- Endpoints actuales de `mobile/api`.
- Helpers existentes de Supabase/auth.
- Tablas reales en Supabase relacionadas con `restaurants`, `profiles`, `subscriptions`, `invoices`, `recipes`, `products`.
- Estructura del Centro Control existente.

No implementar nada sin confirmar:

- Como se identifica actualmente `restaurant_id`.
- Como se obtiene el usuario actual.
- Si existe ya tabla de perfiles, subscripciones o admin users.
- Como se protege Centro Control.

### Fase 1 - Modelo de datos

Crear migracion Supabase con estas tablas, ajustando nombres al patron existente del repo.

#### `app_events`

Eventos operativos no sensibles.

Campos sugeridos:

```sql
id uuid primary key default gen_random_uuid(),
restaurant_id uuid references public.restaurants(id) on delete cascade,
user_id uuid references auth.users(id) on delete set null,
event_name text not null,
route text,
source text default 'escandallos_app',
metadata jsonb default '{}'::jsonb,
app_version text,
user_agent text,
created_at timestamptz not null default now()
```

Indices:

```sql
create index on public.app_events (restaurant_id, created_at desc);
create index on public.app_events (user_id, created_at desc);
create index on public.app_events (event_name, created_at desc);
```

Eventos iniciales recomendados:

- `user_logged_in`
- `setup_started`
- `setup_completed`
- `invoice_upload_started`
- `invoice_upload_completed`
- `invoice_upload_failed`
- `ocr_started`
- `ocr_completed`
- `ocr_failed`
- `product_created`
- `recipe_created`
- `recipe_cost_calculated`
- `alert_created`
- `stripe_checkout_started`
- `subscription_active`
- `subscription_failed`
- `support_ticket_created`

#### `app_errors`

Errores de frontend, API y procesos criticos.

Campos sugeridos:

```sql
id uuid primary key default gen_random_uuid(),
restaurant_id uuid references public.restaurants(id) on delete set null,
user_id uuid references auth.users(id) on delete set null,
severity text not null default 'error',
error_type text,
message text not null,
stack text,
route text,
endpoint text,
metadata jsonb default '{}'::jsonb,
resolved_at timestamptz,
created_at timestamptz not null default now()
```

Indices:

```sql
create index on public.app_errors (created_at desc);
create index on public.app_errors (restaurant_id, created_at desc);
create index on public.app_errors (severity, created_at desc);
create index on public.app_errors (resolved_at);
```

#### `support_tickets`

Tickets creados por usuarios desde la app.

Campos sugeridos:

```sql
id uuid primary key default gen_random_uuid(),
restaurant_id uuid not null references public.restaurants(id) on delete cascade,
user_id uuid references auth.users(id) on delete set null,
status text not null default 'open',
priority text not null default 'normal',
subject text not null,
message text not null,
route text,
metadata jsonb default '{}'::jsonb,
assigned_to uuid references auth.users(id) on delete set null,
closed_at timestamptz,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now()
```

Estados:

- `open`
- `in_progress`
- `waiting_customer`
- `resolved`
- `closed`

#### `support_messages`

Conversacion del ticket.

Campos sugeridos:

```sql
id uuid primary key default gen_random_uuid(),
ticket_id uuid not null references public.support_tickets(id) on delete cascade,
author_user_id uuid references auth.users(id) on delete set null,
author_role text not null,
message text not null,
metadata jsonb default '{}'::jsonb,
created_at timestamptz not null default now()
```

`author_role`:

- `customer`
- `admin`
- `system`

#### `app_health_checks`

Estado operativo del sistema.

Campos sugeridos:

```sql
id uuid primary key default gen_random_uuid(),
service_name text not null,
status text not null,
latency_ms integer,
message text,
metadata jsonb default '{}'::jsonb,
checked_at timestamptz not null default now()
```

Servicios iniciales:

- `supabase`
- `vercel_api`
- `stripe_webhook`
- `ocr_ai`
- `storage`

### Fase 2 - Seguridad y RLS

Activar RLS en todas las tablas.

Politicas recomendadas:

- Usuarios normales pueden insertar sus propios eventos, errores y tickets de su restaurante.
- Usuarios normales pueden leer sus propios tickets y mensajes.
- Usuarios normales no pueden leer `app_events` globales ni `app_errors` globales.
- Admin/Centro Control puede leer todo usando backend protegido.
- Si no existe un sistema de admins por tabla, usar service role solo desde el backend del Centro Control.

Claude debe revisar el patron actual de RLS antes de escribir politicas.

### Fase 3 - Helpers en EscandallosAppV2

Crear utilidades ligeras, sin bloquear UX si fallan.

Archivos sugeridos:

```txt
mobile/src/utils/telemetry/trackEvent.js
mobile/src/utils/telemetry/trackError.js
mobile/src/utils/support/createTicket.js
```

Requisitos:

- Nunca romper una pantalla si falla la telemetria.
- No guardar datos sensibles de factura completa en metadata.
- Limitar metadata a contexto operativo.
- Incluir `restaurant_id`, `user_id`, ruta actual y fecha.
- Evitar duplicacion de eventos masivos.

Ejemplo conceptual:

```js
await trackEvent('invoice_upload_completed', {
  invoice_id,
  provider_name,
  product_count,
  total_amount,
});
```

No guardar:

- IBAN completo.
- Datos fiscales sensibles no necesarios.
- Factura completa en texto bruto.
- Tokens, keys o JWT.

### Fase 4 - Instrumentacion inicial

Instrumentar solo puntos de alto valor:

- Login correcto.
- Setup iniciado/completado.
- Upload de factura iniciado/completado/fallido.
- OCR iniciado/completado/fallido.
- Producto creado.
- Receta creada.
- Calculo de coste de receta.
- Checkout Stripe iniciado.
- Ticket de soporte creado.

No instrumentar cada click. El objetivo es senal, no ruido.

### Fase 5 - Soporte dentro de EscandallosAppV2

Agregar entrada de soporte visible pero discreta.

Opciones:

- Boton en settings/perfil si existe.
- Boton flotante pequeño solo en pantallas principales.
- Ruta `/support` o modal.

Formulario minimo:

- Asunto.
- Mensaje.
- Checkbox opcional: "Enviar contexto tecnico para ayudar al soporte".

Contexto tecnico permitido:

- Ruta actual.
- Restaurante.
- Plan.
- Ultimos eventos no sensibles.
- Ultimos errores del usuario.
- Navegador/dispositivo.

Al enviar:

- Crear `support_tickets`.
- Crear primer `support_messages`.
- Registrar evento `support_ticket_created`.

### Fase 6 - Centro Control

En el repo `/Users/luis/Developer/lumo-monorepo/apps/centro-control`, crear seccion para Escandallos.

Pantallas recomendadas:

#### Dashboard resumen

Metricas:

- Restaurantes totales.
- Usuarios activos ultimos 7 dias.
- Facturas subidas hoy/7 dias.
- Errores ultimas 24h.
- Tickets abiertos.
- Subscripciones activas.
- Fallos de Stripe/OCR.

#### Restaurantes

Tabla:

- Nombre.
- Owner.
- Plan.
- Estado setup.
- Ultima actividad.
- Facturas.
- Recetas.
- Productos.
- Tickets abiertos.

Detalle restaurante:

- Timeline de eventos.
- Errores recientes.
- Tickets.
- Estado de subscripcion.
- Acciones administrativas seguras.

#### Errores

Tabla:

- Fecha.
- Severidad.
- Restaurante.
- Usuario.
- Ruta/endpoint.
- Mensaje.
- Estado resuelto/no resuelto.

Acciones:

- Marcar resuelto.
- Ver metadata.
- Ir al restaurante asociado.

#### Tickets

Tabla:

- Estado.
- Prioridad.
- Restaurante.
- Usuario.
- Asunto.
- Ultima respuesta.
- Fecha creacion.

Detalle:

- Conversacion.
- Eventos recientes del usuario.
- Errores recientes.
- Cambiar estado/prioridad.

#### Salud del sistema

Semaforo:

- Supabase.
- Vercel API.
- Stripe webhook.
- OCR/IA.
- Storage.

### Fase 7 - Alertas

Primera version simple:

- Vista de errores/tickets en Centro Control.
- Badge rojo si hay errores criticos no resueltos.

Segunda version:

- Notificacion por email/Telegram/Slack cuando:
  - `ocr_failed` sube de umbral.
  - Stripe webhook falla.
  - Error critico API.
  - Nuevo ticket premium.

### Fase 8 - Privacidad, legal y retencion

Definir retencion:

- `app_events`: 90 o 180 dias.
- `app_errors`: 180 dias o hasta resolucion + 90 dias.
- `support_tickets`: conservar mientras haya relacion comercial.
- `metadata`: minimo necesario.

Actualizar legal si se activa telemetria:

- Politica de privacidad.
- Terminos de servicio.
- Texto de soporte explicando contexto tecnico opcional.

## Criterios de aceptacion V1

La version 1 se considera lista si:

- Las migraciones aplican en Supabase sin romper tablas existentes.
- Todas las tablas nuevas tienen RLS activado.
- Un usuario autenticado puede crear un ticket desde Escandallos.
- Un evento de upload/setup/login se registra correctamente.
- Un error controlado se registra sin romper la app.
- Centro Control muestra restaurantes, eventos, errores y tickets.
- No se expone `service_role` en frontend publico.
- `npm run build` pasa en EscandallosAppV2.
- El build/test relevante pasa en Centro Control.

## Riesgos

- Guardar datos sensibles en metadata.
- Generar demasiados eventos y ensuciar Supabase.
- Usar service role en frontend.
- Hacer panel admin sin autorizacion fuerte.
- Mezclar datos de Ferlu/AbocadosOS con LumoTech/Escandallos.
- Intentar hacer todo en una unica fase grande.

## Recomendacion de implementacion

Primero construir V1 muy pequena:

1. Migraciones: eventos, errores, tickets.
2. Helper `trackEvent`.
3. Helper `trackError`.
4. Formulario simple de soporte.
5. Vista basica en Centro Control.

Despues iterar:

1. Realtime.
2. Alertas.
3. Sentry/PostHog.
4. Health checks automaticos.
5. Analitica comercial.

## Prompt sugerido para Claude Code

```txt
Lee este documento y analiza el estado real de EscandallosAppV2 y Centro Control.

Primero no implementes: revisa estructura, auth, Supabase, RLS y patrones del proyecto.

Despues propon una Fase 1 concreta con archivos a tocar, migraciones necesarias y riesgos.

Cuando este validado, implementa solo la V1 minima:
- tablas app_events, app_errors, support_tickets, support_messages;
- helpers trackEvent/trackError;
- soporte basico en Escandallos;
- vista admin basica en Centro Control si el patron del repo lo permite.

No uses service_role en frontend.
No guardes datos sensibles en metadata.
No mezcles trunk Ferlu/AbocadosOS con LumoTech/Escandallos.
No hagas drops ni cambios destructivos.
```


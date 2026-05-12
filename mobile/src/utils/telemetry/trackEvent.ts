import { supabase } from '../supabase';

export type TrackableEvent =
  | 'user_logged_in'
  | 'setup_started'
  | 'setup_completed'
  | 'invoice_upload_started'
  | 'invoice_upload_completed'
  | 'invoice_upload_failed'
  | 'ocr_started'
  | 'ocr_completed'
  | 'ocr_failed'
  | 'product_created'
  | 'recipe_created'
  | 'recipe_cost_calculated'
  | 'alert_created'
  | 'stripe_checkout_started'
  | 'subscription_active'
  | 'subscription_failed'
  | 'support_ticket_created';

type MetadataValue = string | number | boolean | null;

export interface TrackEventPayload {
  restaurantId?: string | null;
  route?: string | null;
  metadata?: Record<string, MetadataValue>;
  appVersion?: string | null;
}

export function trackEvent(
  eventName: TrackableEvent,
  payload: TrackEventPayload = {}
): void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) return;

      await supabase.from('app_events').insert({
        user_id: user.id,
        restaurant_id: payload.restaurantId ?? null,
        event_name: eventName,
        route: payload.route ?? getCurrentRoute(),
        source: 'escandallos_app',
        metadata: sanitizeMetadata(payload.metadata),
        app_version: payload.appVersion ?? null,
        user_agent: getUserAgent(),
      });
    } catch {
      // Telemetria silenciosa: nunca debe romper la experiencia de usuario.
    }
  })();
}

function getCurrentRoute(): string | null {
  if (typeof window === 'undefined') return null;
  return window.location?.pathname ?? null;
}

function getUserAgent(): string | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.userAgent.slice(0, 200);
}

function sanitizeMetadata(
  metadata: Record<string, MetadataValue> | undefined
): Record<string, MetadataValue> {
  if (!metadata) return {};

  const blockedKeys = [
    'authorization',
    'cookie',
    'iban',
    'jwt',
    'key',
    'password',
    'secret',
    'token',
  ];

  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => {
      const normalized = key.toLowerCase();
      return !blockedKeys.some((blocked) => normalized.includes(blocked));
    })
  );
}

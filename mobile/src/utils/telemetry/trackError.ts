import { supabase } from '../supabase';

export type ErrorSeverity = 'critical' | 'error' | 'warning';

type MetadataValue = string | number | boolean | null;

export interface TrackErrorPayload {
  restaurantId?: string | null;
  severity?: ErrorSeverity;
  errorType?: string | null;
  message: string;
  stack?: string | null;
  route?: string | null;
  endpoint?: string | null;
  metadata?: Record<string, MetadataValue>;
}

export function trackError(payload: TrackErrorPayload): void {
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      await supabase.from('app_errors').insert({
        user_id: user?.id ?? null,
        restaurant_id: payload.restaurantId ?? null,
        severity: payload.severity ?? 'error',
        error_type: payload.errorType ?? null,
        message: payload.message.slice(0, 1000),
        stack: payload.stack?.slice(0, 3000) ?? null,
        route: payload.route ?? getCurrentRoute(),
        endpoint: payload.endpoint ?? null,
        metadata: sanitizeMetadata(payload.metadata),
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

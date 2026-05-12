import { supabase } from '../supabase';
import { trackEvent } from '../telemetry/trackEvent';

type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CreateTicketPayload {
  restaurantId: string;
  subject: string;
  message: string;
  priority?: TicketPriority;
  includeTechContext?: boolean;
}

export interface CreateTicketResult {
  success: boolean;
  ticketId?: string;
  error?: string;
}

export async function createTicket(
  payload: CreateTicketPayload
): Promise<CreateTicketResult> {
  try {
    const { data, error: userError } = await supabase.auth.getUser();
    const user = data.user;
    if (userError || !user) return { success: false, error: 'No autenticado' };

    const subject = payload.subject.trim().slice(0, 200);
    const message = payload.message.trim().slice(0, 2000);
    if (!subject || !message) {
      return { success: false, error: 'Asunto y mensaje son obligatorios' };
    }

    const route = getCurrentRoute();
    const metadata = payload.includeTechContext
      ? {
          route,
          user_agent: getUserAgent(),
        }
      : {};

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        restaurant_id: payload.restaurantId,
        user_id: user.id,
        subject,
        message,
        priority: payload.priority ?? 'normal',
        route,
        metadata,
      })
      .select('id')
      .single();

    if (ticketError || !ticket) {
      return {
        success: false,
        error: ticketError?.message ?? 'No se pudo crear el ticket',
      };
    }

    const { error: messageError } = await supabase.from('support_messages').insert({
      ticket_id: ticket.id,
      author_user_id: user.id,
      author_role: 'customer',
      message,
    });

    if (messageError) return { success: false, error: messageError.message };

    trackEvent('support_ticket_created', {
      restaurantId: payload.restaurantId,
      metadata: {
        ticket_id: ticket.id,
        priority: payload.priority ?? 'normal',
      },
    });

    return { success: true, ticketId: ticket.id };
  } catch {
    return { success: false, error: 'Error inesperado' };
  }
}

function getCurrentRoute(): string | null {
  if (typeof window === 'undefined') return null;
  return window.location?.pathname ?? null;
}

function getUserAgent(): string | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.userAgent.slice(0, 200);
}

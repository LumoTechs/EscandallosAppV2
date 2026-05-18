-- Tickets de soporte enviados por los usuarios al equipo de LumoTechs
CREATE TABLE public.support_tickets (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email       TEXT        NOT NULL,
  subject     TEXT        NOT NULL,
  description TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX support_tickets_user_id_idx ON public.support_tickets(user_id);

-- Respuestas dentro de un ticket (author: 'user' | 'support')
CREATE TABLE public.support_replies (
  id        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID        REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  author    TEXT        NOT NULL CHECK (author IN ('user', 'support')),
  message   TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX support_replies_ticket_id_idx ON public.support_replies(ticket_id);

-- Web Push subscriptions: one row per browser/device that a user enabled
-- phone notifications on. Run once in Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint    TEXT NOT NULL UNIQUE,
    p256dh      TEXT NOT NULL,
    auth        TEXT NOT NULL,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
    ON public.push_subscriptions (user_id);

-- Only the backend (service role) may read or write subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

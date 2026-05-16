CREATE TABLE IF NOT EXISTS public.web_push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  greenhouse_id VARCHAR(50) NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  expiration_time BIGINT NULL,
  user_agent TEXT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_greenhouse
  ON public.web_push_subscriptions (user_id, greenhouse_id);

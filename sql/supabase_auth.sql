-- Supabase PostgreSQL: Auth schema for SmartFarm backend (custom auth table)

CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- Optional RLS template (disabled by default for backend service-role usage)
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "users_select_own" ON public.users
-- FOR SELECT USING (auth.jwt() ->> 'email' = email);

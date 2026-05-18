CREATE TABLE IF NOT EXISTS public.iot_devices (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  greenhouse_id TEXT NOT NULL REFERENCES public.greenhouses(greenhouse_id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('sensor', 'light', 'pump', 'window')),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'provisioned', 'active', 'revoked')),
  last_seen_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iot_devices_owner_user_id ON public.iot_devices(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_iot_devices_greenhouse_id ON public.iot_devices(greenhouse_id);
CREATE INDEX IF NOT EXISTS idx_iot_devices_status ON public.iot_devices(status);

CREATE TABLE IF NOT EXISTS public.device_credentials (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES public.iot_devices(device_id) ON DELETE CASCADE,
  mqtt_username TEXT NOT NULL,
  mqtt_password_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_credentials_device_id ON public.device_credentials(device_id);
CREATE INDEX IF NOT EXISTS idx_device_credentials_expires_at ON public.device_credentials(expires_at);

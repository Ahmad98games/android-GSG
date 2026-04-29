-- ONBOARDING & SYSTEM SETTINGS (v1.0.0)
-- Stores industrial configuration and onboarding state

CREATE TABLE IF NOT EXISTS public.system_settings (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_name        TEXT NOT NULL,
  industry_type       TEXT NOT NULL,
  onboarding_complete BOOLEAN DEFAULT false NOT NULL,
  setup_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure only one global settings record for now, or per-admin if multi-tenant
  -- For this ERP, we assume a single instance/factory
  singleton_key       INTEGER DEFAULT 1 UNIQUE CHECK (singleton_key = 1)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage settings
CREATE POLICY "authenticated_manage_settings" ON public.system_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public read if necessary for early UI (optional)
CREATE POLICY "anon_read_settings" ON public.system_settings
  FOR SELECT TO anon USING (true);

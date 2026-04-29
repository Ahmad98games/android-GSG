-- GOLD SHE INDUSTRIAL ERP // UNIFIED PRODUCTION SCHEMA MANIFEST (v8.6.1)
-- Run this in the Supabase SQL Editor to restore all mission-critical tables.

-- 1. SETTINGS & CONFIGURATION
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROCUREMENT & SUPPLY CHAIN
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LOGISTICS & RETURNS
CREATE TABLE IF NOT EXISTS public.order_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id),
    return_reason TEXT NOT NULL,
    return_type TEXT DEFAULT 'FULL_RETURN',
    status TEXT DEFAULT 'REQUESTED',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FORENSIC AUDITING & MONITORING
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INITIAL SEED DATA
INSERT INTO public.system_settings (key, value, description) 
VALUES 
('chori_guard_wastage_pct', '4.0', 'Industrial wastage buffer'),
('chori_guard_shrinkage_pct', '6.5', 'Fabric shrinkage allowance'),
('whatsapp_phone_number_id', '', 'Meta WhatsApp API Phone ID'),
('whatsapp_access_token', '', 'Meta WhatsApp API Long-lived Token')
ON CONFLICT (key) DO NOTHING;

-- REFRESH SCHEMA CACHE AFTER RUNNING
-- NOTIFY: Tables restored to INDUSTRIAL_CORE_v8.6.1 standards.

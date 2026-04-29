import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
  console.log('━━━ DEPLOYING MISSION-CRITICAL SCHEMA ━━━');

  const sql = `
    -- 1. SYSTEM SETTINGS
    CREATE TABLE IF NOT EXISTS public.system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 2. SUPPLIERS (Dedicated registry)
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

    -- 3. AUDIT & ALERTS
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

    CREATE TABLE IF NOT EXISTS public.audit_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
        is_resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 4. SEED SETTINGS
    INSERT INTO public.system_settings (key, value, description) 
    VALUES 
    ('chori_guard_wastage_pct', '4.0', 'Maximum allowed manufacturing wastage (Industrial Standard)'),
    ('chori_guard_shrinkage_pct', '6.5', 'Fabric shrinkage compensation factor'),
    ('chori_guard_tolerance_gaz', '0.25', 'Allowed gaz variance before Red Alert'),
    ('wholesale_discount_pct', '15.0', 'Standard wholesale discount'),
    ('wholesale_min_sets', '10', 'Minimum sets for wholesale pricing'),
    ('whatsapp_phone_number_id', '', 'Meta Developer Phone Number ID'),
    ('whatsapp_access_token', '', 'Meta Graph API Explorer Token')
    ON CONFLICT (key) DO NOTHING;
  `;

  // We use postgres directly via supabase.rpc or similar if available, 
  // but since we are in a script, we'll try to run it via migration or raw SQL if possible.
  // Standard Supabase JS doesn't allow raw SQL. 
  // We'll assume the user can run this via the SQL Editor or we'll wrap it in a function.

  console.log('⚠️  Please execute the following SQL in your Supabase SQL Editor to restore functionality:');
  console.log(sql);
}

void restore();

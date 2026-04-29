-- Create whatsapp_log table
CREATE TABLE IF NOT EXISTS whatsapp_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID, 
  order_id UUID,
  status_trigger TEXT, 
  phone TEXT,
  message TEXT, 
  api_status INT,
  api_response JSONB, 
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for whatsapp_log (optional but good practice)
ALTER TABLE whatsapp_log ENABLE ROW LEVEL SECURITY;

-- Add webhook for order status changes
-- Note: This requires the net extension to be enabled in Supabase
-- Ideally done via Supabase dashboard webhooks UI, but here is the logic:
-- Create party_portal_tokens table
CREATE TABLE IF NOT EXISTS party_portal_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID REFERENCES parties(id),
  token UUID DEFAULT gen_random_uuid() UNIQUE,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE party_portal_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read by token" ON party_portal_tokens FOR SELECT USING (expires_at > NOW());

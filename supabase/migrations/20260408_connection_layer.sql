-- ECOSYSTEM CONNECTION LAYER REBUILD (v9.0.0)
-- Establishing reliable PC ↔ Mobile sync with E2EE

CREATE TABLE IF NOT EXISTS public.node_registrations (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  node_slot           INT NOT NULL,
  device_name         TEXT NOT NULL DEFAULT 'Unknown Device',
  device_fingerprint  TEXT UNIQUE,
  role                TEXT NOT NULL DEFAULT 'FIELD_NODE',
  public_key_pem      TEXT,
  push_token          TEXT,
  last_seen_at        TIMESTAMPTZ,
  battery_pct         INT,
  signal_strength     INT,
  current_screen      TEXT,
  is_active           BOOL DEFAULT false NOT NULL,
  linked_at           TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT max_10_nodes CHECK (node_slot BETWEEN 1 AND 10)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_node_slot ON public.node_registrations(node_slot);

-- Pairing codes (6-digit, 10 min TTL)
CREATE TABLE IF NOT EXISTS public.node_pairing_tokens (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code                CHAR(6) NOT NULL,
  node_slot           INT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'FIELD_NODE',
  device_fingerprint  TEXT,
  claimed             BOOL DEFAULT false NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pairing_code ON public.node_pairing_tokens(code) WHERE NOT claimed;

-- Messenger channels
CREATE TABLE IF NOT EXISTS public.messenger_channels (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'BROADCAST' CHECK (type IN ('BROADCAST','DIRECT','ROLE')),
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed default channels
INSERT INTO public.messenger_channels (name, type, description) VALUES
  ('all-nodes',        'BROADCAST', 'Everyone — PC and all mobile nodes'),
  ('command-center',   'BROADCAST', 'PC admin broadcasts to all nodes'),
  ('production-floor', 'ROLE',      'Production floor nodes only'),
  ('dispatch-bay',     'ROLE',      'Dispatch bay nodes only')
ON CONFLICT DO NOTHING;

-- Messenger messages (E2E encrypted content stored as ciphertext)
CREATE TABLE IF NOT EXISTS public.messenger_messages (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id      UUID REFERENCES public.messenger_channels(id) ON DELETE CASCADE,
  sender_type     TEXT NOT NULL CHECK (sender_type IN ('PC_ADMIN','NODE')),
  sender_id       TEXT NOT NULL,
  sender_label    TEXT NOT NULL,
  message_type    TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT','IMAGE','FILE','VOICE','SYSTEM','COMMAND')),
  content_enc     TEXT,
  content_plain   TEXT,
  file_url        TEXT,
  file_name       TEXT,
  file_size_bytes BIGINT,
  voice_url       TEXT,
  voice_duration  INT,
  reply_to_id     UUID REFERENCES public.messenger_messages(id) ON DELETE SET NULL,
  deleted_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
-- Ensure existing tables have synchronization columns
ALTER TABLE public.messenger_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.messenger_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messenger_messages(channel_id, created_at DESC);

-- Message read receipts
CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id  UUID REFERENCES public.messenger_messages(id) ON DELETE CASCADE,
  reader_id   TEXT NOT NULL,
  reader_type TEXT NOT NULL,
  read_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (message_id, reader_id)
);

-- Node tasks (PC → specific mobile node)
CREATE TABLE IF NOT EXISTS public.node_tasks (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_node_id  UUID REFERENCES public.node_registrations(id) ON DELETE CASCADE,
  task_type       TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            JSONB,
  status          TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACKNOWLEDGED','COMPLETED')),
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Broadcast alerts (PC → all nodes)
CREATE TABLE IF NOT EXISTS public.broadcast_alerts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT,
  severity   TEXT DEFAULT 'INFO' CHECK (severity IN ('INFO','WARNING','CRITICAL')),
  sent_by    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- File transfer log
CREATE TABLE IF NOT EXISTS public.file_transfers (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id       TEXT NOT NULL,
  sender_label    TEXT NOT NULL,
  recipient_id    TEXT,
  channel_id      UUID REFERENCES public.messenger_channels(id),
  file_name       TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  file_type       TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  public_url      TEXT NOT NULL,
  downloaded_by   TEXT[],
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Offline message queue (for messages sent while server is unreachable)
CREATE TABLE IF NOT EXISTS public.offline_queue (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key UUID UNIQUE NOT NULL,
  sender_id       TEXT NOT NULL,
  channel_id      UUID,
  payload         JSONB NOT NULL,
  operation_type  TEXT NOT NULL,
  synced_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS (permissive for now — tighten per role later)
ALTER TABLE public.node_registrations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_channels     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messenger_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_pairing_tokens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_alerts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_transfers         ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write (adjust per role later)
CREATE POLICY "authenticated_full" ON public.node_registrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full" ON public.messenger_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full" ON public.messenger_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full" ON public.node_pairing_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full" ON public.node_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full" ON public.broadcast_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_full" ON public.file_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anon to read channels (for pairing flow before auth)
CREATE POLICY "anon_read_channels" ON public.messenger_channels FOR SELECT TO anon USING (true);

-- Enable realtime on key tables (idempotent wrapper)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messenger_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messenger_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'node_registrations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.node_registrations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'node_tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.node_tasks;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'broadcast_alerts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_alerts;
  END IF;
END $$;

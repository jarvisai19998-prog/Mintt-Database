CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  primary_color VARCHAR(7) DEFAULT '#0066cc',
  secretary_email VARCHAR(255),
  phone VARCHAR(20),
  voice_phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  service_needed TEXT,
  message TEXT,
  source VARCHAR(50) DEFAULT 'web',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  session_id VARCHAR(100) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100),
  role VARCHAR(20),
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phone_leads (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  call_id VARCHAR(255) UNIQUE,
  client_name VARCHAR(255),
  caller_phone VARCHAR(50),
  caller_name VARCHAR(255),
  service_needed TEXT,
  transcript TEXT,
  summary TEXT,
  recording_url TEXT,
  duration_seconds INTEGER,
  is_emergency BOOLEAN DEFAULT FALSE,
  lead_score INTEGER,
  score_reason TEXT,
  score_breakdown JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  plan VARCHAR(50) DEFAULT 'pending',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Test clients
INSERT INTO clients (company_name, slug, primary_color, secretary_email)
VALUES ('Sparks Electric', 'sparks-electric', '#FF6B00', 'test@example.com')
ON CONFLICT (slug) DO NOTHING;

-- ── MIGRATIONS (safe to run on existing databases) ──────────────────────────

-- Add voice_phone_number to clients (stores the Bland.ai/Vapi inbound number)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS voice_phone_number VARCHAR(20);

-- Add client_id to phone_leads for multi-tenancy
ALTER TABLE phone_leads ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);

-- Index for fast per-client lead lookups
CREATE INDEX IF NOT EXISTS idx_phone_leads_client_id ON phone_leads(client_id);

-- Backfill: stamp all existing phone_leads with Unitech Controls' client_id.
-- Safe no-op if Unitech does not exist yet or leads are already stamped.
UPDATE phone_leads
SET client_id = c.id
FROM clients c
WHERE phone_leads.client_id IS NULL
  AND (c.company_name ILIKE '%unitech%' OR c.slug ILIKE '%unitech%');

-- ── Change 1: Admin user columns ─────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT TRUE;

-- Replace the single-email unique constraint with email+name uniqueness.
-- Existing users have name=NULL, so (email, NULL) is still unique per Postgres rules.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_name_key ON users (email, name) WHERE name IS NOT NULL;

-- ── Change 2: Mintt platform client (for marketing-site chatbot leads) ────────
INSERT INTO clients (company_name, slug, primary_color, secretary_email)
VALUES ('Mintt', 'mintt', '#00c96b', 'office@mintt.ca')
ON CONFLICT (slug) DO NOTHING;
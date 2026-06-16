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
-- ── MIGRATION: Client-agnostic chatbot columns ────────────────────────────────

-- Trade/industry (e.g. "industrial electrical", "plumbing", "HVAC")
ALTER TABLE clients ADD COLUMN IF NOT EXISTS trade VARCHAR(100);

-- Service area description (e.g. "Greater Toronto Area and Southern Ontario")
ALTER TABLE clients ADD COLUMN IF NOT EXISTS service_area VARCHAR(255);

-- Public-facing business email (distinct from secretary_email which is for alerts)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS business_email VARCHAR(255);

-- Business website
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Services offered — stored as JSONB array of {name, description} objects
ALTER TABLE clients ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]';

-- Industries served — JSONB array of strings (optional, B2B clients)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industries_served JSONB DEFAULT '[]';

-- Business hours / availability description
ALTER TABLE clients ADD COLUMN IF NOT EXISTS hours VARCHAR(255);

-- AI persona display name (e.g. "Aria", "Max", "Unitech AI")
ALTER TABLE clients ADD COLUMN IF NOT EXISTS persona_name VARCHAR(100);

-- Conversation tone (e.g. "professional", "friendly", "concise")
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tone VARCHAR(50) DEFAULT 'professional';

-- First message the AI sends when chat opens
ALTER TABLE clients ADD COLUMN IF NOT EXISTS greeting TEXT;

-- End-of-call message for voice agent
ALTER TABLE clients ADD COLUMN IF NOT EXISTS end_call_message TEXT;

-- Emergency trigger keywords (comma-separated, e.g. "no power,explosion,fire")
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_keywords TEXT;

-- What the AI says/does when emergency keywords are detected
ALTER TABLE clients ADD COLUMN IF NOT EXISTS emergency_protocol TEXT;

-- Vapi voice agent credentials (per-client so each client has their own assistant)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS vapi_assistant_id VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS vapi_public_key VARCHAR(255);

-- Logo URL for white-label emails and widget branding
ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- One-liner description used in the AI prompt
ALTER TABLE clients ADD COLUMN IF NOT EXISTS one_liner TEXT;

-- Physical address(es) — JSONB array of strings
ALTER TABLE clients ADD COLUMN IF NOT EXISTS locations JSONB DEFAULT '[]';

-- ── Backfill Unitech Controls from hardcoded setup-unitech.js values ──────────
UPDATE clients SET
  trade               = 'industrial electrical and controls',
  service_area        = 'Greater Toronto Area and Southern Ontario',
  business_email      = 'info@unitechcontrols.com',
  website             = 'https://unitechcontrols.com',
  one_liner           = 'Industrial electrical contractor specializing in controls, automation, and power systems',
  locations           = '["1234 Industrial Pkwy, Mississauga ON", "Toronto, ON"]',
  hours               = '24/7 emergency service available',
  persona_name        = 'Unitech AI',
  tone                = 'professional',
  greeting            = 'Hello! Thank you for contacting Unitech Controls. I''m here to help with your electrical and controls needs. How can I assist you today?',
  end_call_message    = 'Thank you for calling Unitech Controls. We''ll have someone follow up with you shortly.',
  emergency_keywords  = 'no power,power outage,explosion,fire,electrical fire,sparks,shutdown,emergency',
  emergency_protocol  = 'This sounds like an emergency situation. Please call our 24/7 emergency line immediately at our main number. If there is immediate danger, call 911 first.',
  services            = '[
    {"name": "Industrial Electrical", "description": "Complete electrical installations and maintenance for industrial facilities"},
    {"name": "Control Systems", "description": "PLC programming, SCADA systems, and automation controls"},
    {"name": "Power Distribution", "description": "Switchgear, transformers, and power distribution systems"},
    {"name": "Motor Controls", "description": "VFD installation, motor starters, and drive systems"},
    {"name": "Energy Management", "description": "Energy audits, power monitoring, and efficiency upgrades"},
    {"name": "Emergency Service", "description": "24/7 emergency electrical response"}
  ]',
  industries_served   = '["Manufacturing", "Oil & Gas", "Food & Beverage", "Automotive", "Warehousing & Logistics"]'
WHERE slug = 'unitech' OR company_name ILIKE '%unitech%';
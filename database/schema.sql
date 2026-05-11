CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  primary_color VARCHAR(7) DEFAULT '#0066cc',
  secretary_email VARCHAR(255),
  phone VARCHAR(20),
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

-- Test clients
INSERT INTO clients (company_name, slug, primary_color, secretary_email)
VALUES ('Sparks Electric', 'sparks-electric', '#FF6B00', 'test@example.com')
ON CONFLICT (slug) DO NOTHING;
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection and run pending migrations on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('✅ Database connected');
    release();
    runMigrations().catch(e => console.error('Migration error:', e.message));
  }
});

async function runMigrations() {
  const migrations = [
    `ALTER TABLE clients ADD COLUMN IF NOT EXISTS voice_phone_number VARCHAR(20)`,
    `ALTER TABLE phone_leads ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id)`,
    `CREATE INDEX IF NOT EXISTS idx_phone_leads_client_id ON phone_leads(client_id)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_email_name_key ON users (email, name) WHERE name IS NOT NULL`,
    `INSERT INTO clients (company_name, slug, primary_color, secretary_email) VALUES ('Sparks Electric', 'sparks-electric', '#FF6B00', 'test@example.com') ON CONFLICT (slug) DO NOTHING`,
    `INSERT INTO clients (company_name, slug, primary_color, secretary_email) VALUES ('Mintt', 'mintt', '#00c96b', 'office@mintt.ca') ON CONFLICT (slug) DO NOTHING`,
  ];
  for (const sql of migrations) {
    await pool.query(sql);
  }
  console.log('✅ Migrations applied');
}

// Get client by slug (for demo pages)
async function getClientBySlug(slug) {
  const result = await pool.query(
    'SELECT * FROM clients WHERE slug = $1', [slug]
  );
  return result.rows[0];
}

// Save a lead
async function saveLead(clientId, leadData) {
  const { name, email, phone, serviceNeeded, message, source } = leadData;
  const result = await pool.query(
    `INSERT INTO leads (client_id, name, email, phone, service_needed, message, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [clientId, name, email, phone, serviceNeeded, message, source || 'web']
  );
  return result.rows[0];
}

// Get all leads
async function getAllLeads() {
  const result = await pool.query(
    `SELECT l.*, c.company_name FROM leads l
     LEFT JOIN clients c ON l.client_id = c.id
     ORDER BY l.created_at DESC`
  );
  return result.rows;
}

// Get all clients
async function getAllClients() {
  const result = await pool.query(
    'SELECT * FROM clients ORDER BY created_at DESC'
  );
  return result.rows;
}

// Save chat message
async function saveChatMessage(sessionId, role, content) {
  await pool.query(
    `INSERT INTO chat_messages (session_id, role, content)
     VALUES ($1, $2, $3)`,
    [sessionId, role, content]
  );
}

// Get chat history for a session
async function getChatHistory(sessionId) {
  const result = await pool.query(
    `SELECT role, content FROM chat_messages
     WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );
  return result.rows;
}

module.exports = {
  pool,
  getClientBySlug,
  saveLead,
  getAllLeads,
  getAllClients,
  saveChatMessage,
  getChatHistory,
};
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('✅ Database connected');
    release();
  }
});

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
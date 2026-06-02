/**
 * One-shot migration script — run once against the live Railway database.
 * Usage:
 *   $env:DATABASE_URL="postgresql://..."; node scripts/migrate.js
 *
 * Safe to re-run: all DDL uses IF NOT EXISTS / DO NOTHING.
 */
require('dotenv').config();
const { Pool } = require('pg');

const UNITECH_VOICE_PHONE = process.env.UNITECH_VOICE_PHONE || '+12898099128';

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set. Export it before running this script.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Step 1: Add columns ──────────────────────────────────────────────────
    console.log('Step 1 — Adding voice_phone_number to clients...');
    await client.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS voice_phone_number VARCHAR(20)
    `);

    console.log('Step 1 — Adding client_id to phone_leads...');
    await client.query(`
      ALTER TABLE phone_leads ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id)
    `);

    console.log('Step 1 — Creating index on phone_leads(client_id)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_phone_leads_client_id ON phone_leads(client_id)
    `);

    // ── Step 2: Show clients before touching anything ────────────────────────
    console.log('\nStep 2 — Current clients table:');
    const clientsRes = await client.query(`SELECT id, company_name, slug, voice_phone_number FROM clients ORDER BY id`);
    console.table(clientsRes.rows);

    // ── Step 3: Backfill existing phone_leads with Unitech's client_id ───────
    console.log('\nStep 3 — Backfilling phone_leads with Unitech client_id...');
    const backfill = await client.query(`
      UPDATE phone_leads
      SET client_id = c.id
      FROM clients c
      WHERE phone_leads.client_id IS NULL
        AND (c.company_name ILIKE '%unitech%' OR c.slug ILIKE '%unitech%')
    `);
    console.log(`  Rows updated: ${backfill.rowCount}`);

    // ── Step 4: Set Unitech's voice phone number ─────────────────────────────
    console.log(`\nStep 4 — Setting voice_phone_number = ${UNITECH_VOICE_PHONE} for Unitech...`);
    const phoneUpdate = await client.query(`
      UPDATE clients
      SET voice_phone_number = $1
      WHERE company_name ILIKE '%unitech%' OR slug ILIKE '%unitech%'
    `, [UNITECH_VOICE_PHONE]);
    console.log(`  Rows updated: ${phoneUpdate.rowCount}`);

    await client.query('COMMIT');

    // ── Step 5: Verify ───────────────────────────────────────────────────────
    console.log('\nStep 5 — Verification:');
    const verifyClients = await pool.query(`SELECT id, company_name, slug, voice_phone_number FROM clients ORDER BY id`);
    console.log('clients:');
    console.table(verifyClients.rows);

    const verifyLeads = await pool.query(`
      SELECT client_id, COUNT(*) AS lead_count FROM phone_leads GROUP BY client_id ORDER BY client_id
    `);
    console.log('phone_leads grouped by client_id:');
    console.table(verifyLeads.rows);

    console.log('\n✅  Migration complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Migration failed — rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();

/**
 * Seed script — creates three Mintt platform admin accounts.
 *
 * Usage (run once against the live Railway database):
 *   $env:DATABASE_URL="postgresql://..."; $env:ADMIN_TEMP_PASSWORD="ChooseAStrongOne!"; node scripts/seed-admins.js
 *
 * Safe to re-run: INSERT … ON CONFLICT DO NOTHING.
 * Password is NEVER committed — read from ADMIN_TEMP_PASSWORD env var only.
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set.');
  process.exit(1);
}
if (!process.env.ADMIN_TEMP_PASSWORD) {
  console.error('❌  ADMIN_TEMP_PASSWORD is not set. Set it before running this script.');
  process.exit(1);
}

const ADMIN_EMAIL = 'office@mintt.ca';
const ADMINS = ['Bailey', 'Khalid', 'Josh'];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const client = await pool.connect();
  try {
    // ── Step 1: ensure schema columns exist ──────────────────────────────────
    console.log('Step 1 — Ensuring admin columns exist on users table...');
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100)`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT TRUE`);
    await client.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key`);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_name_key
      ON users (email, name) WHERE name IS NOT NULL
    `);
    console.log('  ✅ Schema ready.');

    // ── Step 2: ensure Mintt client exists ───────────────────────────────────
    console.log('\nStep 2 — Ensuring Mintt client row exists...');
    await client.query(`
      INSERT INTO clients (company_name, slug, primary_color, secretary_email)
      VALUES ('Mintt', 'mintt', '#00c96b', $1)
      ON CONFLICT (slug) DO NOTHING
    `, [ADMIN_EMAIL]);
    const clientRes = await client.query(`SELECT id FROM clients WHERE slug = 'mintt' LIMIT 1`);
    if (!clientRes.rows.length) {
      throw new Error("Mintt client row missing after INSERT — check clients table.");
    }
    const minttClientId = clientRes.rows[0].id;
    console.log(`  ✅ Mintt client id = ${minttClientId}`);

    // ── Step 3: hash the password ────────────────────────────────────────────
    console.log('\nStep 3 — Hashing password (bcrypt, 12 rounds)...');
    const hash = await bcrypt.hash(process.env.ADMIN_TEMP_PASSWORD, 12);
    console.log('  ✅ Done.');

    // ── Step 4: insert admin accounts ────────────────────────────────────────
    console.log('\nStep 4 — Creating admin accounts...');
    for (const name of ADMINS) {
      const res = await client.query(
        `INSERT INTO users (email, name, password_hash, plan, client_id, is_admin, force_password_change)
         VALUES ($1, $2, $3, 'agency', $4, true, true)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [ADMIN_EMAIL, name, hash, minttClientId]
      );
      if (res.rows.length) {
        console.log(`  ✅ Created: ${name} <${ADMIN_EMAIL}> — user id ${res.rows[0].id}`);
      } else {
        console.log(`  ⏭  Already exists: ${name} <${ADMIN_EMAIL}> — skipped`);
      }
    }

    // ── Step 5: verify ───────────────────────────────────────────────────────
    console.log('\nStep 5 — Verification:');
    const verify = await client.query(
      `SELECT id, name, email, plan, is_admin, force_password_change, client_id
       FROM users WHERE email = $1 ORDER BY name`,
      [ADMIN_EMAIL]
    );
    console.table(verify.rows);

    console.log('\n✅  All done. Admins can now log in at:');
    console.log('    https://mintt-database-production.up.railway.app/login.html');
    console.log('    Email:    ' + ADMIN_EMAIL);
    console.log('    Password: [what you set in ADMIN_TEMP_PASSWORD]');
    console.log('    Name:     Bailey  OR  Khalid  OR  Josh');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});

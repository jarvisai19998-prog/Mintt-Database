const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const { pool } = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  starter: 'price_1TZJc8ENZELNVTZu9rmVU4SZ',
  growth:  'price_1TZJc9ENZELNVTZuQdFMS7f5',
  agency:  'price_1TZJc9ENZELNVTZuvvdP5HMu',
};

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, companyName, plan } = req.body;
    if (!email || !password || !companyName || !plan) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!PRICE_IDS[plan]) {
      return res.status(400).json({ error: 'Invalid plan. Choose starter, growth, or agency.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const customer = await stripe.customers.create({ email, name: companyName });

    const userResult = await pool.query(
      'INSERT INTO users (email, password_hash, stripe_customer_id, plan) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, password_hash, customer.id, 'pending']
    );
    const userId = userResult.rows[0].id;

    const baseUrl = process.env.APP_URL || 'https://mintt-database-production.up.railway.app';
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/login.html?payment=success`,
      cancel_url: `${baseUrl}/login.html`,
      metadata: { userId: String(userId), companyName, plan },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed', detail: err.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const result = await pool.query(
      `SELECT u.*, c.company_name FROM users u
       LEFT JOIN clients c ON u.client_id = c.id
       WHERE u.email = $1`,
      [email]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user.id, clientId: user.client_id, email: user.email, plan: user.plan },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        companyName: user.company_name,
        clientId: user.client_id,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.plan, u.created_at, c.company_name
       FROM users u LEFT JOIN clients c ON u.client_id = c.id
       WHERE u.id = $1`,
      [req.user.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const { pool } = require('../database/db');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function slugify(str) {
  return (str || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'client';
}

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, companyName, plan } = session.metadata || {};

    if (!userId) {
      console.warn('Webhook: missing userId in metadata');
      return res.json({ received: true });
    }

    try {
      const userRow = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
      const email = userRow.rows[0]?.email || '';
      const slug = slugify(companyName);

      const clientResult = await pool.query(
        `INSERT INTO clients (company_name, slug, primary_color, secretary_email)
         VALUES ($1, $2, '#6366f1', $3)
         ON CONFLICT (slug) DO UPDATE SET company_name = EXCLUDED.company_name
         RETURNING id`,
        [companyName, slug, email]
      );
      const clientId = clientResult.rows[0].id;

      await pool.query(
        'UPDATE users SET client_id = $1, stripe_subscription_id = $2, plan = $3 WHERE id = $4',
        [clientId, session.subscription, plan, userId]
      );

      console.log(`✅ Payment complete — user ${userId}, client ${clientId} (${companyName}), plan ${plan}`);
    } catch (err) {
      console.error('Webhook DB error:', err.message);
    }
  }

  res.json({ received: true });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../database/db');
const { requireAuth } = require('../middleware/auth');

router.get('/leads', requireAuth, async (req, res) => {
  if (!req.user.clientId) {
    return res.status(402).json({ error: 'No active subscription. Please complete payment first.' });
  }
  try {
    const result = await pool.query(
      `SELECT l.*, c.company_name FROM leads l
       LEFT JOIN clients c ON l.client_id = c.id
       WHERE l.client_id = $1
       ORDER BY l.created_at DESC`,
      [req.user.clientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Dashboard leads error:', err);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { getAllLeads, getAllClients } = require('../database/db');

// GET /admin/stats
router.get('/stats', async (req, res) => {
  try {
    const leads = await getAllLeads();
    const clients = await getAllClients();

    res.json({
      totalLeads: leads.length,
      totalClients: clients.length,
      recentLeads: leads.slice(0, 10),
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// GET /admin/leads
router.get('/leads', async (req, res) => {
  try {
    const leads = await getAllLeads();
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

// GET /admin/clients
router.get('/clients', async (req, res) => {
  try {
    const clients = await getAllClients();
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get clients' });
  }
});

module.exports = router;
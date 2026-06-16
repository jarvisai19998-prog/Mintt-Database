const express = require('express');
const router = express.Router();
const { getClientBySlug } = require('../database/db');

// Public endpoint — called by the widget on client websites
// Returns only the fields the widget needs (no secrets beyond Vapi public key)
router.get('/config', async (req, res) => {
  try {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'slug is required' });

    const client = await getClientBySlug(slug);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    res.json({
      companyName:     client.company_name,
      personaName:     client.persona_name || `${client.company_name} AI`,
      primaryColor:    client.primary_color || '#00c96b',
      endCallMessage:  client.end_call_message || `Thanks for contacting ${client.company_name}! Our team will be in touch shortly.`,
      vapiPublicKey:   client.vapi_public_key,
      vapiAssistantId: client.vapi_assistant_id,
    });
  } catch (err) {
    console.error('Widget config error:', err);
    res.status(500).json({ error: 'Failed to load widget config' });
  }
});

module.exports = router;
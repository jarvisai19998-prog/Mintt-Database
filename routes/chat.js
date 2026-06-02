const express = require('express');
const router = express.Router();
const { getChatResponse } = require('../services/claude');
const { getClientBySlug, saveLead, saveChatMessage, getChatHistory } = require('../database/db');
const { sendLeadNotification } = require('../services/email');
const { v4: uuidv4 } = require('uuid');

router.post('/message', async (req, res) => {
  try {
    const { message, sessionId, clientSlug } = req.body;
    const client = await getClientBySlug(clientSlug || 'sparks-electric');
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const sid = sessionId || uuidv4();
    await saveChatMessage(sid, 'user', message);
    const history = await getChatHistory(sid);
    const messages = history.map(m => ({ role: m.role, content: m.content }));
    const reply = await getChatResponse(messages, client);
    await saveChatMessage(sid, 'assistant', reply);
    res.json({ reply, sessionId: sid });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

router.post('/lead', async (req, res) => {
  try {
    const { name, email, phone, serviceNeeded, message, clientSlug } = req.body;
    const client = await getClientBySlug(clientSlug || 'sparks-electric');
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const lead = await saveLead(client.id, { name, email, phone, serviceNeeded, message, source: 'web' });
    try {
      await sendLeadNotification({ name, email, phone, serviceNeeded, message, clientName: client.company_name });
    } catch (emailErr) {
      console.error('Email failed:', emailErr.message);
    }
    res.json({ success: true, leadId: lead.id });
  } catch (err) {
    console.error('Lead error:', err);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

module.exports = router;
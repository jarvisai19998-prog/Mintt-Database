const express = require('express');
const router = express.Router();
const { getChatResponse } = require('../services/claude');
const { getClientBySlug, saveLead, saveChatMessage, getChatHistory } = require('../database/db');
const { sendLeadNotification, sendCustomerConfirmation } = require('../services/email');
const { v4: uuidv4 } = require('uuid');

router.post('/message', async (req, res) => {
  try {
    const { message, sessionId, clientSlug } = req.body;

    if (!clientSlug) {
      return res.status(400).json({ error: 'clientSlug is required' });
    }

    const client = await getClientBySlug(clientSlug);
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

    if (!clientSlug) {
      return res.status(400).json({ error: 'clientSlug is required' });
    }

    const client = await getClientBySlug(clientSlug);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const lead = await saveLead(client.id, { name, email, phone, serviceNeeded, message, source: 'web' });

    // Respond immediately — don't let email block the request
    res.json({ success: true, leadId: lead.id });

    // Notify Mintt + client secretary
    sendLeadNotification({
      name,
      email,
      phone,
      serviceNeeded,
      message,
      clientName: client.company_name,
      notificationEmail: client.secretary_email,
    }).catch(err => console.error('Lead notification failed:', err.message));

    // White-label confirmation to the end customer using client's branding
    if (email) {
      sendCustomerConfirmation({
        name,
        email,
        serviceNeeded,
        client, // full client object for white-label branding
      }).catch(err => console.error('Customer confirmation failed:', err.message));
    }
  } catch (err) {
    console.error('Lead error:', err);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

module.exports = router;
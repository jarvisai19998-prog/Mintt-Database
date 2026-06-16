const express = require('express');
const router = express.Router();
const { getClientBySlug } = require('../database/db');

// Public endpoint — called by the widget on client websites
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

// Triggers a Bland.ai outbound call to the user
router.post('/callback', async (req, res) => {
  try {
    const { phone, clientSlug } = req.body;
    if (!phone || !clientSlug) {
      return res.status(400).json({ error: 'phone and clientSlug are required' });
    }

    const client = await getClientBySlug(clientSlug);
    if (!client) return res.status(404).json({ error: 'Client not found' });

    const agentId = '58790e75-077e-4370-9ea5-151836ac7218';
    const blandKey = process.env.BLAND_API_KEY;
    const personaName = client.persona_name || client.company_name + ' AI';

    const task = `You are ${personaName}, the AI assistant for ${client.company_name}, a ${client.trade || 'trade'} company serving ${client.service_area || 'Ontario'}.

A potential customer has requested a callback from the ${client.company_name} website. 

Your job:
1. Greet them warmly and introduce yourself as ${personaName}
2. Ask how you can help them today
3. Understand their need before asking for contact info
4. Capture their name and confirm their phone number
5. Let them know someone from the ${client.company_name} team will follow up shortly

${client.emergency_keywords ? `EMERGENCY: If they mention ${client.emergency_keywords}, say immediately: "${client.emergency_protocol}"` : ''}

Keep replies short and natural for a phone conversation. Never quote prices or promise specific appointment times.`;

    const response = await fetch('https://api.bland.ai/v1/calls', {
      method: 'POST',
      headers: {
        'Authorization': blandKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phone,
        agent_id: agentId,
        task: task,
        request_data: {
          company_name: client.company_name,
          persona_name: personaName,
        },
      }),
    });

    const data = await response.json();
    console.log('Bland.ai response:', data);

    if (data.status === 'success' || data.call_id) {
      res.json({ success: true, callId: data.call_id });
    } else {
      res.status(500).json({ error: data.message || 'Bland.ai call failed' });
    }
  } catch (err) {
    console.error('Callback error:', err);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

module.exports = router;
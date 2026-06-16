const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { extractLeadFromTranscript } = require('../services/vapi');
const { sendSecretaryEmail, sendCustomerConfirmation } = require('../services/email-voice');
const { pool } = require('../database/db');
const { requireAuth } = require('../middleware/auth');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── VOICE WEBHOOK ──
router.post('/webhook', async (req, res) => {
  const webhookSecret = process.env.VOICE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const provided = req.headers['x-webhook-secret'] || req.headers['authorization'];
    const token = provided?.startsWith('Bearer ') ? provided.slice(7) : provided;
    if (token !== webhookSecret) {
      return res.status(401).send('Unauthorized');
    }
  }
  res.sendStatus(200);
  try {
    const event = req.body;
    console.log('\n📞 Bland.ai webhook received:', event.status || event.type);

    // Bland sends status updates — we only care about "completed" calls
    if (event.status === 'completed' || event.type === 'end') {
      await handleCallEnded(event);
    }
  } catch (err) {
    console.error('Voice webhook error:', err);
  }
});

async function scoreCall(transcript, summary) {
  try {
    const prompt = `You are a lead scoring expert for an industrial electrical contracting company.

Score this phone call lead on a scale of 1-10 based on these criteria:
- Urgency (1-3): Is it emergency/urgent (3), soon (2), or vague/no timeline (1)?
- Service clarity (1-3): Do they clearly describe the work needed (3), somewhat clear (2), or vague (1)?
- Info captured (1-2): Did we get name AND phone (2), only one (1), or neither (0)?
- Engagement (1-2): Was caller engaged and cooperative (2), neutral (1), or difficult (0)?

Total score = sum of all criteria (max 10).

Transcript:
${transcript}

Summary: ${summary || 'No summary available'}

Respond ONLY with valid JSON in this exact format:
{
  "score": 7,
  "reason": "One sentence explaining the score",
  "breakdown": {
    "urgency": 2,
    "serviceClarity": 3,
    "infoCaptured": 1,
    "engagement": 1
  }
}`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Scoring error:', err);
    return { score: 5, reason: 'Could not score automatically.', breakdown: { urgency: 1, serviceClarity: 2, infoCaptured: 1, engagement: 1 } };
  }
}

function extractCallType(transcript) {
  const t = (transcript || '').toLowerCase();
  if (t.includes('emergency') || t.includes('no power') || t.includes('shutdown') || t.includes('urgent')) return 'Emergency';
  if (t.includes('quote') || t.includes('pricing') || t.includes('how much') || t.includes('cost')) return 'Quote Request';
  if (t.includes('install') || t.includes('installation') || t.includes('new system')) return 'Installation';
  if (t.includes('product') || t.includes('order') || t.includes('plc') || t.includes('vfd') || t.includes('information')) return 'Product Info';
  if (t.includes('repair') || t.includes('broken') || t.includes('not working') || t.includes('service') || t.includes('maintenance') || t.includes('fix')) return 'Service Call';
  return 'General Inquiry';
}

function extractServiceFromTranscript(transcript) {
  const t = (transcript || '').toLowerCase();
  const services = [
    { keywords: ['panel', 'breaker', 'electrical panel'], label: 'Panel upgrade' },
    { keywords: ['ev charger', 'electric vehicle', 'car charger'], label: 'EV charger installation' },
    { keywords: ['outlet', 'plug', 'receptacle'], label: 'Outlet installation' },
    { keywords: ['light', 'lighting', 'fixture'], label: 'Lighting' },
    { keywords: ['generator'], label: 'Generator' },
    { keywords: ['rewir', 'wiring'], label: 'Rewiring' },
    { keywords: ['inspection'], label: 'Electrical inspection' },
    { keywords: ['no power', 'power out', 'outage', 'emergency'], label: 'Emergency — power issue' },
    { keywords: ['automation', 'plc', 'controls', 'scada', 'hmi'], label: 'Industrial automation' },
    { keywords: ['vfd', 'drive', 'variable frequency'], label: 'VFD / Motor drive' },
    { keywords: ['safety'], label: 'Safety upgrade' },
    { keywords: ['maintenance', 'preventive'], label: 'Preventive maintenance' },
    { keywords: ['commercial', 'industrial'], label: 'Commercial/Industrial electrical' },
  ];
  for (const s of services) {
    if (s.keywords.some(k => t.includes(k))) return s.label;
  }
  return 'Not specified';
}

async function lookupClientByPhone(dialedNumber) {
  if (!dialedNumber) return null;
  // Normalize to digits-only for a forgiving match
  const digits = dialedNumber.replace(/\D/g, '');
  const result = await pool.query(
    `SELECT id, company_name, secretary_email
     FROM clients
     WHERE REGEXP_REPLACE(voice_phone_number, '\\D', '', 'g') = $1
     LIMIT 1`,
    [digits]
  );
  return result.rows[0] || null;
}

async function savePhoneLead({ clientId, callId, clientName, callerPhone, callerName, serviceNeeded, callType, transcript, summary, recordingUrl, durationSeconds, isEmergency, leadScore, scoreReason, scoreBreakdown }) {
  try {
    await pool.query(
      `INSERT INTO phone_leads (client_id, call_id, client_name, caller_phone, caller_name, service_needed, transcript, summary, recording_url, duration_seconds, is_emergency, lead_score, score_reason, score_breakdown)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (call_id) DO NOTHING`,
      [clientId, callId, clientName, callerPhone, callerName, serviceNeeded, transcript, summary, recordingUrl, durationSeconds, isEmergency, leadScore, scoreReason, JSON.stringify(scoreBreakdown)]
    );
    console.log('✅ Phone lead saved to database');
  } catch (err) {
    console.error('Failed to save phone lead:', err.message);
  }
}

async function handleCallEnded(event) {
  // Bland.ai webhook fields
  const callId = event.call_id || event.id;
  const transcript = event.concatenated_transcript || event.transcript || '';
  const summary = event.summary || '';
  const durationSeconds = Math.round(event.call_length || event.duration || 0);
  const recordingUrl = event.recording_url || null;
  const fromNumber = event.from || event.caller_number || null;
  // The number the caller dialed — used to identify which client owns this call
  const dialedNumber = event.to || event.inbound_phone_number || event.called || null;

  console.log(`\n📞 Call completed: ${callId} (${durationSeconds}s)`);
  console.log(`   From: ${fromNumber}  →  To: ${dialedNumber}`);

  // Resolve client from the dialed number
  const client = await lookupClientByPhone(dialedNumber);
  if (!client) {
    console.warn(`  ⚠️  No client matched dialed number ${dialedNumber} — saving lead with null client_id`);
  } else {
    console.log(`  Client: ${client.company_name} (id ${client.id})`);
  }

  const clientId = client?.id || null;
  const clientName = client?.company_name || 'Unknown Client';
  const secretaryEmail = client?.secretary_email || process.env.NOTIFICATION_EMAIL || 'office@mintt.ca';

  const lead = extractLeadFromTranscript(transcript, {
    from: fromNumber,
    recording_url: recordingUrl,
  });

  const serviceNeeded = extractServiceFromTranscript(transcript);
  const callType = extractCallType(transcript);

  const callTime = new Date().toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  console.log(`  Call type: ${callType}`);
  console.log(`  Service: ${serviceNeeded}`);
  console.log(`  Caller email: ${lead.callerEmail || 'not provided'}`);
  console.log('  Scoring lead...');

  const scoring = await scoreCall(transcript, summary);
  console.log(`  Score: ${scoring.score}/10 — ${scoring.reason}`);

  await savePhoneLead({
    clientId,
    callId,
    clientName,
    callerPhone: lead.callerPhone || fromNumber,
    callerName: lead.callerName,
    serviceNeeded,
    callType,
    transcript,
    summary,
    recordingUrl,
    durationSeconds,
    isEmergency: lead.isEmergency || callType === 'Emergency',
    leadScore: scoring.score,
    scoreReason: scoring.reason,
    scoreBreakdown: scoring.breakdown,
  });

  // Send secretary score card
  try {
    await sendSecretaryEmail({
      callerName: lead.callerName,
      callerPhone: lead.callerPhone || fromNumber,
      callerEmail: lead.callerEmail,
      mentionedPhone: lead.mentionedPhone,
      serviceNeeded,
      callType,
      callTime,
      durationSeconds,
      transcript,
      recordingUrl,
      callId,
      clientName,
      secretaryEmail,
      leadScore: scoring.score,
      scoreReason: scoring.reason,
      scoreBreakdown: scoring.breakdown,
    });
    console.log('✅ Score card sent to secretary');
  } catch (err) {
    console.error('❌ Secretary email failed:', err.message);
  }

  // Send customer confirmation if email captured
  if (lead.callerEmail) {
    try {
      await sendCustomerConfirmation({
        callerName: lead.callerName,
        callerEmail: lead.callerEmail,
        callerPhone: lead.callerPhone || fromNumber,
        serviceNeeded,
        callType,
        callTime,
        clientName,
      });
      console.log(`✅ Confirmation sent to customer: ${lead.callerEmail}`);
    } catch (err) {
      console.error('❌ Customer email failed:', err.message);
    }
  }
}

router.get('/test', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  res.json({ status: 'ok', webhookUrl: `${protocol}://${req.get('host')}/voice/webhook` });
});

router.get('/leads', requireAuth, async (req, res) => {
  try {
    let result;
    if (req.user.isAdmin) {
      // Platform admins see all clients' phone leads cross-tenant
      result = await pool.query(
        'SELECT * FROM phone_leads ORDER BY created_at DESC LIMIT 500'
      );
    } else {
      if (!req.user.clientId) {
        return res.status(402).json({ error: 'No active subscription. Please complete payment first.' });
      }
      result = await pool.query(
        'SELECT * FROM phone_leads WHERE client_id = $1 ORDER BY created_at DESC LIMIT 50',
        [req.user.clientId]
      );
    }
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch phone leads' });
  }
});

module.exports = router;
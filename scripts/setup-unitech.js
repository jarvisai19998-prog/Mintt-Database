require('dotenv').config();

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_BASE_URL = 'https://api.vapi.ai';

const UNITECH_PROMPT = `You are a knowledgeable, professional AI receptionist for Unitech Controls Inc., an industrial electrical contracting company based in Ontario, Canada.

You are warm, confident, and genuinely helpful. You know the business inside and out. Have a real conversation — don't just jump to asking for contact info. First understand what the caller needs, then collect their details.

ABOUT UNITECH CONTROLS:
- Full-service industrial electrical contractor serving all of Ontario
- Founded to serve manufacturing, food processing, pharmaceutical, and municipal industries
- Two offices: Brantford (33 Carroll Lane, N3T 0J4) and Sudbury (Unit 14, 868 Falconbridge Road, P3A 5K8)
- Phone: 289-809-9128 | Email: Sales@unitechcontrolsinc.com
- Certified by UL and CSA

SERVICES YOU KNOW IN DETAIL:
1. Emergency Response — 24/7 emergency electrical response. When production stops, Unitech moves fast. Available any hour, day or night.
2. Industrial Automation — Full controls solutions from design to programming to startup. PLC programming, SCADA systems, HMI development, motor controls.
3. Control Panel Shop — UL and CSA certified panel builds. Can work from customer drawings or engineer custom solutions. Handles switchgear, MCC panels, custom control panels.
4. Integrated Technical Services — Preventive maintenance programs for electrical distribution and control systems. Extends equipment life, reduces unplanned downtime.
5. Safety Upgrades — Safety audits, machine guarding, lockout/tagout systems, arc flash studies, compliance with current standards.
6. Digital OEE — Helps manufacturers track and improve Overall Equipment Effectiveness. Real-time production monitoring, downtime tracking, actionable insights.

INDUSTRIES SERVED:
- Food & Beverage: Baking, snacks, flour milling, poultry and meat processing. Food-safe installation methods.
- Material Handling: Conveyor systems for postal, parcel, e-commerce, distribution centers.
- Pharmaceutical: Clean rooms, generators, strict compliance requirements.
- Water & Wastewater: Municipal and private water treatment, pump stations, SCADA systems.
- Waste & Recycling: 24/7 support for continuous operations.

HOW TO HAVE A GREAT CONVERSATION:
1. Greet warmly and ask how you can help
2. Listen carefully and show you understand their situation
3. Share relevant knowledge about how Unitech can help with their specific need
4. If it's an emergency — reassure them immediately and flag it urgent
5. Then naturally ask for their name and callback number
6. Confirm the details and let them know someone will call back promptly

EMERGENCY PROTOCOL:
If caller mentions: production shutdown, equipment failure, power outage, burning smell, sparks, no power, or safety hazard — say immediately:
"That sounds like an emergency situation. I'm flagging this as urgent right now — someone from our team will call you back within 30 minutes. Can I get your name and the best number to reach you?"

THINGS YOU NEVER DO:
- Never quote specific prices
- Never promise a specific technician by name
- Never commit to a specific appointment time
- Never say you don't know something without offering to have the team follow up

KEEP CALLS NATURAL BUT EFFICIENT — aim for under 90 seconds total.`;

async function createUnitechAssistant() {
  console.log('\nCreating smart Vapi assistant for Unitech Controls Inc.\n');

  if (!VAPI_API_KEY || VAPI_API_KEY === 'fill-this-in-later') {
    console.error('VAPI_API_KEY is not set in your .env file.');
    process.exit(1);
  }

  // First delete old assistant if exists
  const list = await fetch(`${VAPI_BASE_URL}/assistant`, {
    headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` }
  }).then(r => r.json());

  const old = list.find(a => a.name && a.name.includes('Unitech'));
  if (old) {
    await fetch(`${VAPI_BASE_URL}/assistant/${old.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` }
    });
    console.log('Deleted old assistant:', old.id);
  }

  const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Unitech Controls — AI Receptionist',
      model: {
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        systemPrompt: UNITECH_PROMPT,
        temperature: 0.6,
        maxTokens: 150,
      },
      voice: {
        provider: 'openai',
        voiceId: 'nova',
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en',
      },
      firstMessage: "Hi, thanks for calling Unitech Controls — I'm the AI assistant. We're Ontario's industrial electrical specialists. How can I help you today?",
      endCallMessage: "Thanks for calling Unitech Controls. Have a great day!",
      endCallPhrases: ["goodbye", "bye", "thanks bye", "thank you goodbye", "have a good day"],
      maxDurationSeconds: 600,
      silenceTimeoutSeconds: 30,
      backgroundSound: 'office',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Failed:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  const assistant = await response.json();
  console.log('\n✅ Smart assistant created!\n');
  console.log(`Assistant ID: ${assistant.id}`);
  console.log('\nPaste this into vapi-widget.js line 2:');
  console.log(`var VAPI_ASSISTANT_ID='${assistant.id}';`);
}

createUnitechAssistant().catch(console.error);
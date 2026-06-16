const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Fix: cache keyed by client_id + message to prevent cross-tenant bleed
const faqCache = new Map();

function buildSystemPrompt(clientInfo) {
  const {
    company_name,
    trade = 'trade services',
    service_area = 'Ontario',
    business_email,
    phone,
    website,
    one_liner,
    locations = [],
    hours,
    persona_name,
    tone = 'professional',
    greeting,
    emergency_keywords,
    emergency_protocol,
    services = [],
    industries_served = [],
  } = clientInfo;

  const name = persona_name || `${company_name} AI`;

  // Parse JSONB fields if they come back as strings
  const serviceList = typeof services === 'string' ? JSON.parse(services) : services;
  const industryList = typeof industries_served === 'string' ? JSON.parse(industries_served) : industries_served;
  const locationList = typeof locations === 'string' ? JSON.parse(locations) : locations;

  let prompt = `You are ${name}, the AI assistant for ${company_name}, a ${trade} company serving ${service_area}.`;

  if (one_liner) {
    prompt += `\n${one_liner}.`;
  }

  // Contact & location
  prompt += `\n\nABOUT ${company_name.toUpperCase()}:`;
  if (locationList.length > 0) {
    prompt += `\n- Location(s): ${locationList.join(', ')}`;
  }
  if (phone) {
    prompt += `\n- Phone: ${phone}`;
  }
  if (business_email) {
    prompt += `\n- Email: ${business_email}`;
  }
  if (website) {
    prompt += `\n- Website: ${website}`;
  }
  if (hours) {
    prompt += `\n- Hours: ${hours}`;
  }

  // Services
  if (serviceList.length > 0) {
    prompt += `\n\nSERVICES OFFERED:`;
    for (const svc of serviceList) {
      if (typeof svc === 'object' && svc.name) {
        prompt += `\n- ${svc.name}${svc.description ? ': ' + svc.description : ''}`;
      } else {
        prompt += `\n- ${svc}`;
      }
    }
  }

  // Industries
  if (industryList.length > 0) {
    prompt += `\n\nINDUSTRIES SERVED:\n- ${industryList.join('\n- ')}`;
  }

  // Conversation behaviour
  prompt += `\n\nCONVERSATION STYLE: ${tone}
1. Greet warmly and ask how you can help
2. Understand the customer's need before asking for contact info
3. Share relevant information about the matching service
4. Naturally ask for their name and best callback number to confirm
5. Let them know someone from the team will follow up shortly`;

  // Emergency protocol
  if (emergency_keywords && emergency_protocol) {
    prompt += `\n\nEMERGENCY PROTOCOL:
If the customer mentions any of these keywords: ${emergency_keywords}
Respond immediately with: "${emergency_protocol}"`;
  }

  // Hard rules
  prompt += `\n\nRULES — NEVER:
- Quote specific prices or give cost estimates
- Promise a specific person, appointment time, or response window
- Say you don't know something without offering to have the team follow up
- Mention competitors by name
- Discuss topics unrelated to ${company_name}'s services

Keep replies concise and helpful. You are a lead capture assistant — your goal is to understand the customer's need and collect their contact info so the team can follow up.`;

  return prompt;
}

async function getChatResponse(messages, clientInfo) {
  const systemPrompt = buildSystemPrompt(clientInfo);

  // Cache key includes client_id to prevent cross-tenant cache hits
  const lastMessage = messages[messages.length - 1].content.toLowerCase();
  const cacheKey = `${clientInfo.id}:${lastMessage}`;

  if (faqCache.has(cacheKey)) {
    return faqCache.get(cacheKey);
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: systemPrompt,
    messages: messages,
  });

  const reply = response.content[0].text;

  // Only cache single-turn FAQ-style questions
  if (messages.length === 1) {
    faqCache.set(cacheKey, reply);
  }

  return reply;
}

module.exports = { getChatResponse, buildSystemPrompt };
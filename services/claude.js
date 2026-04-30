const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const faqCache = new Map();

async function getChatResponse(messages, clientInfo) {
  const systemPrompt = `You are a helpful AI assistant for ${clientInfo.company_name}, an electrical contracting company.`;

  const lastMessage = messages[messages.length - 1].content.toLowerCase();
  if (faqCache.has(lastMessage)) {
    return faqCache.get(lastMessage);
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: systemPrompt,
    messages: messages,
  });

  const reply = response.content[0].text;
  if (messages.length === 1) faqCache.set(lastMessage, reply);
  return reply;
}

module.exports = { getChatResponse };
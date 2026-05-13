require('dotenv').config();

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
const VAPI_BASE_URL = 'https://api.vapi.ai';

async function patchAssistant() {
  if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID) {
    console.error('Missing VAPI_API_KEY or VAPI_ASSISTANT_ID in .env');
    process.exit(1);
  }

  console.log(`Patching assistant ${VAPI_ASSISTANT_ID}...`);

  const response = await fetch(`${VAPI_BASE_URL}/assistant/${VAPI_ASSISTANT_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      maxDurationSeconds: 600,
      silenceTimeoutSeconds: 30,
      endCallPhrases: ["goodbye", "bye", "thanks bye", "thank you goodbye", "have a good day"],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Failed:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  const updated = await response.json();
  console.log('\n✅ Assistant updated successfully!');
  console.log(`  Max duration:     ${updated.maxDurationSeconds}s (was 120s)`);
  console.log(`  Silence timeout:  ${updated.silenceTimeoutSeconds}s (was 10s)`);
  console.log(`  End call phrases: ${JSON.stringify(updated.endCallPhrases)}`);
}

patchAssistant().catch(console.error);

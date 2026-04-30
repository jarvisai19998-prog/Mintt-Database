// services/bland.js
// Bland.ai helper — extracts lead info from call transcript

function extractLeadFromTranscript(transcript, callData) {
  const text = transcript || '';

  // Extract phone number
  const phoneRegex = /(\+?1?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g;
  const phoneMatches = text.match(phoneRegex);
  const callerPhone = callData.from || (phoneMatches ? phoneMatches[0] : null);

  // Extract name
  const nameRegex = /(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const nameMatch = text.match(nameRegex);
  const callerName = nameMatch ? nameMatch[1] : null;

  // Extract email
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = text.match(emailRegex);
  const callerEmail = emailMatches ? emailMatches[0] : null;

  // Check for emergency keywords
  const isEmergency = /emergency|urgent|no power|shutdown|fire|sparks|burning/i.test(text);

  // Extract mentioned phone number (different from caller ID)
  const mentionedPhone = phoneMatches && phoneMatches.length > 1 ? phoneMatches[1] : (phoneMatches ? phoneMatches[0] : null);

  return {
    callerPhone,
    callerName,
    callerEmail,
    mentionedPhone,
    isEmergency,
    recordingUrl: callData.recording_url || callData.recordingUrl || null,
  };
}

module.exports = { extractLeadFromTranscript };
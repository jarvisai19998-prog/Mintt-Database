const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// ── HELPERS ──
function scoreColor(score) {
  if (score >= 8) return '#16a34a';
  if (score >= 5) return '#d97706';
  return '#dc2626';
}
function scoreLabel(score) {
  if (score >= 8) return '🔥 Hot Lead';
  if (score >= 5) return '⚡ Warm Lead';
  return '❄️ Cold Lead';
}
function priorityText(score) {
  if (score >= 8) return 'Follow up TODAY — high intent caller.';
  if (score >= 5) return 'Follow up within 24 hours.';
  return 'Add to nurture list — low urgency.';
}
function callTypeIcon(type) {
  const icons = { 'Emergency': '🚨', 'Service Call': '🔧', 'Installation': '⚙️', 'Product Info': '📦', 'Quote Request': '💰', 'General Inquiry': '📋' };
  return icons[type] || '📋';
}

// ── SECRETARY SCORE CARD ──
async function sendSecretaryEmail({ callerName, callerPhone, callerEmail, mentionedPhone, serviceNeeded, callType, callTime, durationSeconds, transcript, recordingUrl, callId, clientName, secretaryEmail, leadScore, scoreReason, scoreBreakdown }) {
  const score = Number(leadScore) || 0;
  const dur = durationSeconds ? `${Math.floor(durationSeconds/60)}m ${durationSeconds%60}s` : 'N/A';
  const recipient = secretaryEmail || process.env.EMAIL_USER;
  const sender = process.env.EMAIL_USER;
  const bd = scoreBreakdown || {};

  const breakdownHtml = scoreBreakdown ? `
    <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin-top:8px;">
      <tr style="background:#f3f4f6;">
        <td style="padding:8px;font-size:12px;color:#6b7280;border:1px solid #e5e7eb;">Urgency</td>
        <td style="padding:8px;font-size:13px;font-weight:700;border:1px solid #e5e7eb;">${bd.urgency}/3</td>
        <td style="padding:8px;font-size:12px;color:#6b7280;border:1px solid #e5e7eb;">Service Clarity</td>
        <td style="padding:8px;font-size:13px;font-weight:700;border:1px solid #e5e7eb;">${bd.serviceClarity}/3</td>
      </tr>
      <tr>
        <td style="padding:8px;font-size:12px;color:#6b7280;border:1px solid #e5e7eb;">Info Captured</td>
        <td style="padding:8px;font-size:13px;font-weight:700;border:1px solid #e5e7eb;">${bd.infoCaptured}/2</td>
        <td style="padding:8px;font-size:12px;color:#6b7280;border:1px solid #e5e7eb;">Engagement</td>
        <td style="padding:8px;font-size:13px;font-weight:700;border:1px solid #e5e7eb;">${bd.engagement}/2</td>
      </tr>
    </table>` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <tr><td style="background:#1e3a5f;padding:24px 28px;">
        <h1 style="margin:0;color:#fff;font-size:20px;">⚡ ElectricLead Pro</h1>
        <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">New Phone Lead — Score Card</p>
      </td></tr>
      <tr><td style="padding:24px 28px 0;text-align:center;">
        <div style="display:inline-block;background:${scoreColor(score)};color:#fff;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;font-weight:bold;">${score}</div>
        <p style="margin:8px 0 0;font-size:18px;font-weight:bold;color:${scoreColor(score)};">${scoreLabel(score)}</p>
        <p style="margin:4px 0 0;color:#64748b;font-size:13px;">out of 10</p>
      </td></tr>
      <tr><td style="padding:16px 28px 0;">
        <div style="background:${scoreColor(score)}22;border-left:4px solid ${scoreColor(score)};border-radius:4px;padding:10px 14px;">
          <strong style="color:${scoreColor(score)};">Action:</strong> <span style="color:#374151;">${priorityText(score)}</span>
        </div>
      </td></tr>
      <tr><td style="padding:20px 28px 0;">
        <h2 style="margin:0 0 12px;font-size:14px;color:#1e3a5f;border-bottom:2px solid #e2e8f0;padding-bottom:6px;">📞 Caller Details</h2>
        <table width="100%" cellpadding="6" cellspacing="0">
          <tr><td style="color:#64748b;font-size:12px;width:120px;">Name</td><td style="font-weight:600;font-size:13px;">${callerName || 'Unknown'}</td></tr>
          <tr><td style="color:#64748b;font-size:12px;">Phone</td><td style="font-weight:600;font-size:13px;">${callerPhone || mentionedPhone || 'Unknown'}</td></tr>
          <tr><td style="color:#64748b;font-size:12px;">Email</td><td style="font-weight:600;font-size:13px;">${callerEmail || 'Not provided'}</td></tr>
          <tr><td style="color:#64748b;font-size:12px;">Call Type</td><td style="font-weight:600;font-size:13px;">${callTypeIcon(callType)} ${callType || 'General Inquiry'}</td></tr>
          <tr><td style="color:#64748b;font-size:12px;">Service</td><td style="font-weight:600;font-size:13px;">${serviceNeeded || 'Not specified'}</td></tr>
          <tr><td style="color:#64748b;font-size:12px;">Call Time</td><td style="font-weight:600;font-size:13px;">${callTime || '—'}</td></tr>
          <tr><td style="color:#64748b;font-size:12px;">Duration</td><td style="font-weight:600;font-size:13px;">${dur}</td></tr>
        </table>
      </td></tr>
      ${scoreBreakdown ? `<tr><td style="padding:20px 28px 0;">
        <h2 style="margin:0 0 12px;font-size:14px;color:#1e3a5f;border-bottom:2px solid #e2e8f0;padding-bottom:6px;">📊 Score Breakdown</h2>
        ${breakdownHtml}
      </td></tr>` : ''}
      ${scoreReason ? `<tr><td style="padding:16px 28px 0;">
        <div style="background:#f8fafc;border-radius:6px;padding:12px;font-size:13px;color:#374151;line-height:1.6;"><strong>Reason:</strong> ${scoreReason}</div>
      </td></tr>` : ''}
      ${transcript ? `<tr><td style="padding:16px 28px 0;">
        <details><summary style="cursor:pointer;font-size:13px;color:#6b7280;font-weight:600;">View Full Transcript</summary>
        <div style="margin-top:8px;background:#f8fafc;border-radius:6px;padding:12px;font-size:12px;color:#374151;line-height:1.8;white-space:pre-wrap;">${transcript}</div></details>
      </td></tr>` : ''}
      ${recordingUrl ? `<tr><td style="padding:12px 28px 0;">
        <a href="${recordingUrl}" style="color:#6366f1;font-size:13px;">🎧 Listen to Recording</a>
      </td></tr>` : ''}
      <tr><td style="padding:24px 28px;text-align:center;color:#94a3b8;font-size:11px;">
        <p style="margin:0;">Generated by <strong>ElectricLead Pro</strong> · ${new Date().getFullYear()}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"${clientName} — AI Receptionist" <${sender}>`,
    to: recipient,
    subject: `[${score}/10] ${callTypeIcon(callType)} ${callType || 'New Lead'}: ${callerName || callerPhone || 'Unknown'} — ${serviceNeeded || 'General Inquiry'}`,
    html,
  });
}

// ── CUSTOMER CONFIRMATION ──
async function sendCustomerConfirmation({ callerName, callerEmail, callerPhone, serviceNeeded, callType, callTime, clientName }) {
  const sender = process.env.EMAIL_USER;
  const firstName = callerName ? callerName.split(' ')[0] : 'there';

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
      <tr><td style="background:#1e3a5f;padding:28px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;">⚡ Unitech Controls Inc.</h1>
        <p style="margin:6px 0 0;color:#93c5fd;font-size:14px;">We received your message!</p>
      </td></tr>
      <tr><td style="padding:32px 28px;">
        <p style="font-size:16px;font-weight:600;color:#1e293b;margin:0 0 16px;">Hi ${firstName},</p>
        <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 20px;">
          Thank you for calling <strong>Unitech Controls Inc.</strong> — Ontario's industrial electrical specialists. 
          We've received your inquiry and a member of our team will be in touch with you shortly.
        </p>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:18px;margin-bottom:20px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:.05em;">Your Request Summary</p>
          <table width="100%" cellpadding="5" cellspacing="0">
            <tr><td style="font-size:12px;color:#64748b;width:120px;">Call Type</td><td style="font-size:13px;font-weight:600;color:#1e293b;">${callTypeIcon(callType)} ${callType || 'General Inquiry'}</td></tr>
            <tr><td style="font-size:12px;color:#64748b;">Service</td><td style="font-size:13px;font-weight:600;color:#1e293b;">${serviceNeeded || 'To be discussed'}</td></tr>
            <tr><td style="font-size:12px;color:#64748b;">Call Time</td><td style="font-size:13px;font-weight:600;color:#1e293b;">${callTime || '—'}</td></tr>
            <tr><td style="font-size:12px;color:#64748b;">Your Phone</td><td style="font-size:13px;font-weight:600;color:#1e293b;">${callerPhone || '—'}</td></tr>
          </table>
        </div>
        <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:14px;margin-bottom:20px;">
          <p style="margin:0;font-size:13px;color:#713f12;">
            ⏱️ <strong>Expected response time:</strong> ${callType === 'Emergency' ? 'Within 30 minutes — this has been flagged as urgent.' : 'Within 1 business day.'}
          </p>
        </div>
        <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 24px;">
          If you need to reach us directly in the meantime, don't hesitate to call us at 
          <strong>289-809-9128</strong> or email <strong>Sales@unitechcontrolsinc.com</strong>.
        </p>
        <p style="font-size:14px;color:#374151;margin:0;">
          Thank you for choosing Unitech Controls,<br/>
          <strong>The Unitech Controls Team</strong>
        </p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:16px 28px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Unitech Controls Inc. · Brantford & Sudbury, Ontario · 289-809-9128</p>
        <p style="margin:4px 0 0;font-size:11px;color:#94a3b8;">Sales@unitechcontrolsinc.com · unitechcontrolsinc.com</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Unitech Controls Inc." <${sender}>`,
    to: callerEmail,
    subject: `We received your call, ${firstName}! — Unitech Controls`,
    html,
  });
}

module.exports = { sendSecretaryEmail, sendCustomerConfirmation };
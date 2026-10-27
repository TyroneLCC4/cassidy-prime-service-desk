import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPPORT_EMAIL = process.env.SUPPORT_INBOX_EMAIL || 'support@cassidyprime.co.za';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      ticketNumber,
      priority,
      category,
      requesterName,
      company,
      phone,
      email,
      location,
      remoteId,
      subject,
      description,
      aiDiagnosticSummary
    } = req.body;

    // 1. Send Instant Escalation Alert to support@cassidyprime.co.za
    const { data, error } = await resend.emails.send({
      from: 'Cassidy Prime Service Desk <alerts@cassidyprime.co.za>',
      to: [SUPPORT_EMAIL],
      replyTo: email && email.includes('@') ? email : undefined,
      subject: `[${priority || 'P2'}] ${ticketNumber}: ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 640px; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
          <h2 style="margin-top: 0; color: #0284c7;">Cassidy Prime Tech — Service Desk Escalation</h2>
          <p style="font-size: 14px; color: #475569;">A new support request has been verified and logged.</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Ticket Ref:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${ticketNumber}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Priority / Category:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${priority} • ${category}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Client:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${requesterName} (${company || 'SME'})</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Phone / WhatsApp:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${phone}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Location Hub:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${location}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>Remote Code:</strong></td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${remoteId || 'Not Provided'}</td></tr>
          </table>
          <h4 style="margin-bottom: 6px;">Issue Description:</h4>
          <pre style="background: #f8fafc; padding: 12px; border-radius: 8px; white-space: pre-wrap; font-size: 13px;">${description}</pre>
          <p style="font-size: 12px; color: #64748b; margin-top: 16px;">AI Triage Summary: ${aiDiagnosticSummary || 'Verified clear issue statement.'}</p>
        </div>
      `
    });

    if (error) {
      return res.status(400).json({ error });
    }

    // 2. Optional: Send Automated Confirmation Receipt to Client if valid email provided
    if (email && email.includes('@')) {
      await resend.emails.send({
        from: 'Cassidy Prime Tech Support <support@cassidyprime.co.za>',
        to: [email],
        subject: `We received your support ticket [${ticketNumber}] — Cassidy Prime Tech`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; color: #0f172a;">
            <h3>Hi ${requesterName},</h3>
            <p>Your request has been logged with <strong>Cassidy Prime Tech (Pty) Ltd</strong> under reference <strong>${ticketNumber}</strong>.</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p>Our engineering team has been alerted. For urgent follow-ups, message our WhatsApp Engineering Desk on <strong>062 146 5780</strong> quoting <strong>${ticketNumber}</strong>.</p>
          </div>
        `
      }).catch(() => {});
    }

    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

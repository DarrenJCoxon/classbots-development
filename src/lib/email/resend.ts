// src/lib/email/resend.ts
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASSWORD || '';
let resend: Resend | null = null; // Initialize as null

const defaultFromName = process.env.EMAIL_FROM_NAME || 'Skolr';
const defaultFromEmail = process.env.EMAIL_FROM_ADDRESS || 'noreply@skolr.app';

if (resendApiKey && resendApiKey.trim() !== '') { // Check if key is not empty
  try {
    resend = new Resend(resendApiKey);
    console.log('[Resend Init] Resend client initialized successfully.');
  } catch (e) {
    console.error('[Resend Init] CRITICAL: Failed to initialize Resend client with provided API key:', e);
    // resend remains null, sendEmail function will handle this
  }
} else {
  console.warn('[Resend Init] WARNING: RESEND_API_KEY (or SMTP_PASSWORD) is not configured or is empty. Email sending will be disabled.');
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromName: string = defaultFromName,
  fromEmail: string = defaultFromEmail
): Promise<boolean> {
  if (!resend) { // Check if resend client was initialized
    console.error('Resend client not initialized or API key missing. Email not sent to:', to);
    return false;
  }

  // Ensure the fromEmail is from a verified domain.
  if (!fromEmail.endsWith('@skolr.app')) { // Adjust if your verified domain is different
     console.warn(
       `[Resend Email] Warning: Attempting to send email from an address (${fromEmail}) ` +
       `that might not be on your primary verified domain (e.g., @skolr.app). `
     );
  }

  try {
    console.log(`Sending email via Resend API to ${to} from "${fromName} <${fromEmail}>" with subject "${subject}"`);
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend API Error sending email:', JSON.stringify(error, null, 2));
      return false;
    }
    console.log('Email sent successfully with Resend API. Message ID:', data?.id);
    return true;
  } catch (error) {
    console.error('Exception caught while sending email with Resend API:', error);
    return false;
  }
}
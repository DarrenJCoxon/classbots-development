// src/lib/email/resend.ts
import { Resend } from 'resend';

const resendApiKey = process.env.SMTP_PASSWORD || '';  // Reuse your existing API key
const resend = new Resend(resendApiKey);

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  fromName: string = 'ClassBots Safety',
  fromEmail: string = 'onboarding@resend.dev'
): Promise<boolean> {
  try {
    console.log(`Sending email via Resend API to ${to}`);
    
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: to,
      subject: subject,
      html: html,
    });
    
    if (error) {
      console.error('Resend API Error:', error);
      return false;
    }
    
    console.log('Email sent successfully with Resend API', data);
    return true;
  } catch (error) {
    console.error('Error sending email with Resend API:', error);
    return false;
  }
}
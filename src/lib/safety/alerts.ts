// src/lib/safety/alerts.ts
import nodemailer from 'nodemailer';
import { APP_NAME } from '@/lib/utils/constants';

// Configure email transport with better logging
const createTransporter = () => {
  console.log("Creating email transporter with configuration:", {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD ? '****' : 'NOT SET', // Log if password is set, but hide actual value
    }
  });

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465', // Usually true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Helper to get user-friendly concern type name
export function getConcernTypeDisplayName(type: string): string {
  if (!type) return 'Unknown Concern';
  // Simple conversion: replace underscore with space, capitalize words
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper to get user-friendly concern level name
export function getConcernLevelDisplayName(level: number): string {
  if (level >= 5) return 'Critical';
  if (level >= 4) return 'High';
  if (level >= 3) return 'Significant';
  if (level >= 2) return 'Moderate';
  if (level >= 1) return 'Minor';
  return 'Low'; // Level 0 should ideally not trigger an alert
}

/**
 * Sends an alert email to the teacher about a flagged message.
 * @param teacherEmail The email address of the teacher.
 * @param studentName The name of the student involved.
 * @param roomName The name of the room where the message occurred.
 * @param concernType The category of the concern.
 * @param concernLevel The severity level (0-5).
 * @param messageContent The content of the flagged message.
 * @param viewUrl The URL for the teacher to view the concern details.
 * @returns Promise<boolean> indicating if the email was sent successfully.
 */
export async function sendTeacherAlert(
  teacherEmail: string,
  studentName: string,
  roomName: string,
  concernType: string,
  concernLevel: number,
  messageContent: string,
  viewUrl: string
): Promise<boolean> {

  // Basic validation
  if (!teacherEmail || !studentName || !roomName || !concernType || concernLevel < 0 || !messageContent || !viewUrl) {
    console.error('Missing required information for sending teacher alert:', {
      teacherEmail: !!teacherEmail,
      studentName: !!studentName,
      roomName: !!roomName,
      concernType: !!concernType,
      concernLevel: concernLevel,
      messageContent: !!messageContent,
      viewUrl: !!viewUrl
    });
    return false;
  }

  // Generate email content
  const concernTypeName = getConcernTypeDisplayName(concernType);
  const concernLevelName = getConcernLevelDisplayName(concernLevel);
  const subject = `[${APP_NAME}] ${concernLevelName} ${concernTypeName} Alert for Student: ${studentName}`;
  const displayedMessage = messageContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        h2 { color: #6B50B7; } /* Use theme primary color */
        h3 { color: #4A3889; } /* Use theme primary dark color */
        ul { list-style: none; padding: 0; }
        li { margin-bottom: 5px; }
        strong { font-weight: bold; }
        blockquote {
          border-left: 4px solid #E5E7EB; /* Use theme border color */
          padding-left: 15px;
          margin-left: 0;
          color: #555;
          background-color: #F9FAFB; /* Use theme card background */
          padding: 10px;
        }
        a.button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #6B50B7; /* Use theme primary color */
          color: white !important; /* Ensure text is white */
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          text-align: center;
        }
         a.button:hover {
             background-color: #4A3889; /* Use theme primary dark color */
         }
      </style>
    </head>
    <body>
      <h2>${APP_NAME} - Student Welfare Alert</h2>
      <p>A message from a student in one of your classrooms has been automatically flagged for a potential welfare concern based on its content.</p>
      <p>Please review the details below and the conversation context as soon as possible.</p>

      <h3>Alert Details:</h3>
      <ul>
        <li><strong>Student:</strong> ${studentName}</li>
        <li><strong>Classroom:</strong> ${roomName}</li>
        <li><strong>Concern Type:</strong> ${concernTypeName}</li>
        <li><strong>Assessed Level:</strong> ${concernLevelName} (Level ${concernLevel})</li>
        <li><strong>Time Detected:</strong> ${new Date().toLocaleString()}</li>
      </ul>

      <h3>Flagged Message:</h3>
      <blockquote>
        <p>${displayedMessage}</p>
      </blockquote>

      <p>Click the button below to view the full conversation context and manage this alert:</p>
      <p style="text-align: center;">
        <a href="${viewUrl}" class="button">Review Concern Now</a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 0.9em; color: #777;">This is an automated message from ${APP_NAME}. Please do not reply directly to this email.</p>
    </body>
    </html>
  `;

  try {
    // Create transporter instance
    const transporter = createTransporter();
    
    // Validate SMTP configuration
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error("SMTP configuration is missing. Cannot send alert email.", {
        host: !!process.env.SMTP_HOST,
        user: !!process.env.SMTP_USER,
        pass: !!process.env.SMTP_PASSWORD
      });
      return false;
    }

    console.log(`Attempting to send email alert to ${teacherEmail}...`);
    
    // Prepare email data with detailed logging
    const emailData = {
      from: process.env.ALERT_EMAIL_FROM || `"${APP_NAME} Safety" <noreply@yourdomain.com>`,
      to: teacherEmail,
      subject: subject,
      html: html,
    };
    
    console.log("Email data prepared:", {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      htmlLength: emailData.html.length
    });
    
    // Send the email
    const info = await transporter.sendMail(emailData);

    console.log(`Teacher alert email sent successfully to ${teacherEmail}.`);
    console.log("Email details:", {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected
    });
    
    return true;
  } catch (error) {
    console.error(`Error sending teacher alert email to ${teacherEmail}:`, error);
    
    // Enhanced error reporting
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      // Check for common SMTP errors
      if (error.message.includes('ECONNREFUSED')) {
        console.error("Connection refused: Check if SMTP_HOST is correct and reachable");
      } 
      else if (error.message.includes('Invalid login')) {
        console.error("Authentication failed: Check your SMTP_USER and SMTP_PASSWORD");
      }
      else if (error.message.includes('certificate')) {
        console.error("SSL/TLS certificate issue: Try setting secure to false or check your connection settings");
      }
    }
    
    return false;
  }
}
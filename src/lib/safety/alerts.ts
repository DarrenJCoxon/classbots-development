// src/lib/safety/alerts.ts
import { sendEmail } from '@/lib/email/resend';
import { APP_NAME } from '@/lib/utils/constants';

export function getConcernTypeDisplayName(type: string): string {
  if (!type) return 'Unknown Concern';
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getConcernLevelDisplayName(level: number): string {
  if (level >= 5) return 'Critical';
  if (level >= 4) return 'High';
  if (level >= 3) return 'Significant';
  if (level >= 2) return 'Moderate';
  if (level >= 1) return 'Minor';
  return 'Low';
}

export async function sendTeacherAlert(
  teacherEmail: string,
  studentName: string,
  roomName: string,
  concernType: string,
  concernLevel: number,
  messageContent: string,
  viewUrl: string
): Promise<boolean> {
  if (!teacherEmail || !studentName || !roomName || !concernType || concernLevel < 0 || !messageContent || !viewUrl) {
    console.error('[Alerts] Missing required information for sending teacher alert.');
    return false;
  }

  const concernTypeName = getConcernTypeDisplayName(concernType);
  const concernLevelName = getConcernLevelDisplayName(concernLevel);
  const subject = `[${APP_NAME}] ${concernLevelName} ${concernTypeName} Alert for Student: ${studentName}`;
  const displayedMessage = messageContent.replace(/</g, "<").replace(/>/g, ">");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; }
        h2 { color: #985DD7; } /* Using skolrPurple from your theme */
        h3 { color: #7a4bb5; } /* Using skolrPurpleDark from your theme */
        ul { list-style: none; padding: 0; }
        li { margin-bottom: 5px; }
        strong { font-weight: bold; }
        blockquote {
          border-left: 4px solid #E5E7EB;
          padding-left: 15px;
          margin-left: 0;
          color: #555;
          background-color: #F9FAFB;
          padding: 10px;
        }
        a.button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #985DD7; /* skolrPurple */
          color: white !important; 
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
          text-align: center;
        }
         a.button:hover {
             background-color: #7a4bb5; /* skolrPurpleDark */
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

  // The fromName and fromEmail will be taken from the defaults in sendEmail,
  // which now read from environment variables.
  // If you want a specific "From Name" for safety alerts that's different from the global default,
  // you can pass it here, e.g., `${APP_NAME} Safety System`.
  // The `fromEmail` should still come from the environment variable to ensure it's from your verified domain.
  const alertFromName = process.env.EMAIL_FROM_NAME ? `${process.env.EMAIL_FROM_NAME} (Safety Alert)` : `${APP_NAME} Safety`;
  
  return await sendEmail(
    teacherEmail,
    subject,
    html,
    alertFromName // Pass a specific From Name for alerts
    // fromEmail will use the default from sendEmail (which is from .env.local)
  );
}
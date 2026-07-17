import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// ─── HTML Email Template ──────────────────────────────────────────────────────

function buildOtpEmailHtml(otp: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>TaskBridge — Email Verification</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1A2744;padding:28px 40px;text-align:center;">
              <h1 style="margin:0;color:#F59E0B;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
                Task<span style="color:#ffffff;">Bridge</span>
              </h1>
              <p style="margin:6px 0 0;color:#94A3B8;font-size:13px;">Bangladeshi Gig Work Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 8px;color:#1A2744;font-size:20px;font-weight:700;">Verify Your Email Address</h2>
              <p style="margin:0 0 28px;color:#64748B;font-size:15px;line-height:1.6;">
                Use the verification code below to complete your TaskBridge account registration.
                This code is valid for <strong>5 minutes</strong>.
              </p>

              <!-- OTP Code Box -->
              <div style="background:#F1F5F9;border:2px dashed #CBD5E1;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#94A3B8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Your Verification Code</p>
                <p style="margin:0;color:#1A2744;font-size:42px;font-weight:800;letter-spacing:12px;font-family:monospace;">${otp}</p>
              </div>

              <!-- Expiry notice -->
              <table role="presentation" width="100%" style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:6px;padding:0;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="margin:0;color:#92400E;font-size:13px;line-height:1.5;">
                      ⏱ &nbsp;This code expires in <strong>5 minutes</strong>. Do not share it with anyone.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Security warning -->
              <table role="presentation" width="100%" style="background:#FEF2F2;border-left:4px solid #EF4444;border-radius:6px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="margin:0;color:#991B1B;font-size:13px;line-height:1.5;">
                      🔒 &nbsp;<strong>Didn't request this?</strong> If you did not attempt to create a TaskBridge account, please ignore this email. Your information is safe.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#94A3B8;font-size:12px;">
                © ${new Date().getFullYear()} TaskBridge · Connecting Bangladeshi Gig Workers & Clients
              </p>
              <p style="margin:4px 0 0;color:#CBD5E1;font-size:11px;">
                This is an automated message — please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const OTP_PLAIN_TEXT = (otp: string) =>
  `Your TaskBridge verification code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this, please ignore this email.`;

// ─── Send via Resend ──────────────────────────────────────────────────────────

async function sendViaResend(to: string, otp: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY!;
  const from = process.env.RESEND_FROM || 'TaskBridge <onboarding@resend.dev>';

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `${otp} is your TaskBridge verification code`,
    html: buildOtpEmailHtml(otp),
    text: OTP_PLAIN_TEXT(otp),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

// ─── Send via Nodemailer (Gmail SMTP fallback) ────────────────────────────────

function isSmtpPlaceholder(v?: string) {
  return !v || v.startsWith('your-') || v === '';
}

async function sendViaSmtp(to: string, otp: string): Promise<void> {
  const host = process.env.SMTP_HOST!;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  const from = process.env.SMTP_FROM || `TaskBridge <${user}>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  const messageId = `${Date.now()}.${Math.random().toString(36).slice(2)}@taskbridge.app`;

  await transporter.sendMail({
    from,
    to,
    subject: `${otp} is your TaskBridge verification code`,
    html: buildOtpEmailHtml(otp),
    text: OTP_PLAIN_TEXT(otp),
    headers: {
      'Message-ID': `<${messageId}>`,
      'X-Mailer': 'TaskBridge',
      'Precedence': 'transactional',
    },
  });
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const smtpReady =
    process.env.SMTP_HOST &&
    !isSmtpPlaceholder(process.env.SMTP_USER) &&
    !isSmtpPlaceholder(process.env.SMTP_PASS);

  process.stderr.write(`\n[MAILER] resendKey=${resendKey ? 'set' : 'NOT SET'} smtpReady=${!!smtpReady} to=${to}\n`);

  // 1. Prefer Resend (most reliable for transactional email)
  if (resendKey && resendKey !== 'your-resend-api-key') {
    process.stderr.write(`[MAILER] → Using Resend\n`);
    await sendViaResend(to, otp);
    process.stderr.write(`[MAILER] ✓ Resend accepted the email\n`);
    return;
  }

  // 2. Fallback to Nodemailer / SMTP
  if (smtpReady) {
    process.stderr.write(`[MAILER] → Using Gmail SMTP\n`);
    await sendViaSmtp(to, otp);
    process.stderr.write(`[MAILER] ✓ SMTP accepted the email\n`);
    return;
  }

  // 3. Dev / mock mode — no email provider configured
  console.log('\n══════════════════════════════════════════════════');
  console.log('[EMAIL MOCK] To:', to);
  console.log('[EMAIL MOCK] Subject: Your TaskBridge Verification Code');
  console.log(`[EMAIL MOCK] OTP Code: ${otp}`);
  console.log('[EMAIL MOCK] Valid for 5 minutes.');
  console.log('══════════════════════════════════════════════════\n');
}

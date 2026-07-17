import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailOtps, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateSecureOtp, hashOtp } from '@/lib/email/otp';
import { sendOtpEmail } from '@/lib/email/mailer';
import { sendOtpRequestSchema } from '@/lib/validators/signup';

// Security constants
const OTP_EXPIRY_MINUTES = 5;
const MAX_RESENDS_PER_WINDOW = 3;
const RESEND_WINDOW_MINUTES = 15;

const isDevMode = () =>
  !process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS;


export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    // 1. Validate input
    const parsed = sendOtpRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request.' },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    // 2. Anti-enumeration: check if email already has an account.
    //    We return generic success to prevent revealing which emails are registered.
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      // Return a convincing success response to prevent email enumeration.
      return NextResponse.json({
        success: true,
        message: 'If this email is not already registered, a verification code has been sent.',
      });
    }

    // 3. Resend rate limiting — check existing unverified OTP for this email
    const existingOtps = await db
      .select()
      .from(emailOtps)
      .where(and(eq(emailOtps.email, email), eq(emailOtps.verified, false)))
      .orderBy(desc(emailOtps.createdAt))
      .limit(1);

    if (existingOtps.length > 0) {
      const latest = existingOtps[0];
      const windowStart = latest.resendWindowStart
        ? new Date(latest.resendWindowStart)
        : new Date(latest.createdAt);
      const windowExpiry = new Date(windowStart.getTime() + RESEND_WINDOW_MINUTES * 60 * 1000);
      const now = new Date();

      if (now < windowExpiry && latest.resendCount >= MAX_RESENDS_PER_WINDOW) {
        const minutesLeft = Math.ceil((windowExpiry.getTime() - now.getTime()) / 60000);
        return NextResponse.json(
          {
            error: `Too many OTP requests. Please wait ${minutesLeft} minute(s) before requesting again.`,
          },
          { status: 429 }
        );
      }
    }

    // 4. Generate cryptographically secure OTP
    const rawOtp = generateSecureOtp();
    const otpHash = await hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // 5. Determine resend metadata
    let newResendCount = 1;
    let resendWindowStart: Date | null = new Date();

    if (existingOtps.length > 0) {
      const latest = existingOtps[0];
      const windowStart = latest.resendWindowStart
        ? new Date(latest.resendWindowStart)
        : new Date(latest.createdAt);
      const windowExpiry = new Date(windowStart.getTime() + RESEND_WINDOW_MINUTES * 60 * 1000);
      const now = new Date();

      if (now < windowExpiry) {
        // Within same resend window — increment count, keep window start
        newResendCount = latest.resendCount + 1;
        resendWindowStart = windowStart;
      }
      // else: window expired — start fresh (newResendCount=1, new window start)
    }

    // 6. Insert new OTP record
    await db.insert(emailOtps).values({
      email,
      otpHash,
      expiresAt,
      attemptCount: 0,
      resendCount: newResendCount,
      resendWindowStart,
      verified: false,
    });

    // 7. Send OTP email (or console log in dev mode)
    await sendOtpEmail(email, rawOtp);

    // 8. Response — only include raw OTP in dev mode for testing convenience
    const responsePayload: Record<string, unknown> = {
      success: true,
      message: 'If this email is not already registered, a verification code has been sent.',
      resendCount: newResendCount,
      resendLimit: MAX_RESENDS_PER_WINDOW,
    };

    if (isDevMode()) {
      responsePayload.otp = rawOtp; // visible only when SMTP is not configured
    }


    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('[email-otp/send] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

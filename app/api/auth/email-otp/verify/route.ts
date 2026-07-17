import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailOtps } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { verifyOtpHash } from '@/lib/email/otp';
import { signJWT } from '@/lib/auth/jose';
import { verifyOtpRequestSchema } from '@/lib/validators/signup';

// Security constants
const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    // 1. Validate input
    const parsed = verifyOtpRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request.' },
        { status: 400 }
      );
    }

    const { email, otpCode, role: roleFromRequest } = parsed.data;


    // 2. Fetch latest unverified OTP record for this email
    const records = await db
      .select()
      .from(emailOtps)
      .where(and(eq(emailOtps.email, email), eq(emailOtps.verified, false)))
      .orderBy(desc(emailOtps.createdAt))
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json(
        { error: 'No active verification request found. Please request a new code.' },
        { status: 400 }
      );
    }

    const record = records[0];

    // 3. Check if OTP has expired
    if (new Date() > new Date(record.expiresAt)) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // 4. Enforce max attempts
    if (record.attemptCount >= MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          error: `Maximum verification attempts (${MAX_ATTEMPTS}) reached. Please request a new code.`,
        },
        { status: 429 }
      );
    }

    // 5. Increment attempt count before verifying (prevents timing-based enumeration)
    await db
      .update(emailOtps)
      .set({ attemptCount: record.attemptCount + 1 })
      .where(eq(emailOtps.id, record.id));

    // 6. Verify OTP hash
    const isValid = await verifyOtpHash(otpCode, record.otpHash);
    if (!isValid) {
      const attemptsLeft = MAX_ATTEMPTS - (record.attemptCount + 1);
      return NextResponse.json(
        {
          error:
            attemptsLeft > 0
              ? `Incorrect verification code. ${attemptsLeft} attempt(s) remaining.`
              : `Maximum verification attempts reached. Please request a new code.`,
        },
        { status: 400 }
      );
    }

    // 7. Mark OTP as verified — invalidate so it cannot be reused
    await db
      .update(emailOtps)
      .set({ verified: true })
      .where(eq(emailOtps.id, record.id));

    // 8. Issue a short-lived temp token (10 minutes) for the final registration step.
    //    The role is stored in the session from earlier state — we read it from the body.
    //    For security, we re-read it from the request; the send step stored it only in the DB record.
    //    We need the role passed from the client (it was collected in Step 1).
    const validRole: 'POSTER' | 'SEEKER' =
      roleFromRequest === 'POSTER' || roleFromRequest === 'SEEKER'
        ? roleFromRequest
        : 'SEEKER'; // safe default

    const tempToken = await signJWT(
      {
        email,
        role: validRole,
        verifiedAt: new Date().toISOString(),
        type: 'email_signup_temp',
      },
      '10m'
    );

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully.',
      tempToken,
    });
  } catch (error) {
    console.error('[email-otp/verify] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

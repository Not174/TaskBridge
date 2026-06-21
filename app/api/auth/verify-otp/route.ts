import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { otpLogs } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth/jose';

export async function POST(req: Request) {
  try {
    const { phone, otpCode, role } = await req.json();

    if (!phone || !otpCode || !role) {
      return NextResponse.json(
        { error: 'Phone, OTP code, and role are required.' },
        { status: 400 }
      );
    }

    // 1. Fetch latest OTP log for this phone number
    const logs = await db
      .select()
      .from(otpLogs)
      .where(and(eq(otpLogs.phone, phone), eq(otpLogs.used, false)))
      .orderBy(desc(otpLogs.expiresAt))
      .limit(1);

    if (logs.length === 0) {
      return NextResponse.json(
        { error: 'No active OTP verification request found.' },
        { status: 400 }
      );
    }

    const latestLog = logs[0];

    // 2. Check if expired
    if (new Date() > new Date(latestLog.expiresAt)) {
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // 3. Verify OTP code match using bcrypt
    const match = await bcrypt.compare(otpCode, latestLog.otpCode);
    if (!match) {
      return NextResponse.json({ error: 'Incorrect OTP code.' }, { status: 400 });
    }

    // 4. Mark OTP as used
    await db
      .update(otpLogs)
      .set({ used: true })
      .where(eq(otpLogs.id, latestLog.id));

    // 5. Generate a short-lived temporary token for step 3 (valid for 10 minutes)
    const tempTokenPayload = {
      phone,
      role,
      verifiedAt: new Date().toISOString(),
      type: 'signup_temp',
    };

    const tempToken = await signJWT(tempTokenPayload, '10m');

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully.',
      tempToken,
    });
  } catch (error: any) {
    console.error('Error in verify-otp API:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

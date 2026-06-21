import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { otpLogs } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';

const BANGLADESHI_PHONE_REGEX = /^01[3-9]\d{8}$/;

export async function POST(req: Request) {
  try {
    const { phone, role } = await req.json();

    // 1. Validate Phone Number
    if (!phone || !BANGLADESHI_PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid Bangladeshi phone number. Must match format 01XXXXXXXXX.' },
        { status: 400 }
      );
    }

    // 2. Validate Role Selection
    if (!role || (role !== 'POSTER' && role !== 'SEEKER')) {
      return NextResponse.json(
        { error: 'Invalid role. Must select POSTER or SEEKER.' },
        { status: 400 }
      );
    }

    // 3. Generate 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // 4. Hash the OTP using bcrypt (salt rounds = 12)
    const salt = await bcrypt.genSalt(12);
    const hashedOtp = await bcrypt.hash(rawOtp, salt);

    // 5. Calculate expiration (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 6. Insert OTP Log in PostgreSQL
    await db.insert(otpLogs).values({
      phone,
      otpCode: hashedOtp,
      expiresAt,
      used: false,
    });

    // 7. Deliver OTP
    const provider = process.env.SMS_PROVIDER || 'mock';
    if (provider === 'mock') {
      console.log(`\n==================================================`);
      console.log(`[SMS MOCK] To: ${phone}`);
      console.log(`[SMS MOCK] Your TaskBridge OTP code is: ${rawOtp}`);
      console.log(`[SMS MOCK] Valid for 5 minutes.`);
      console.log(`==================================================\n`);
    } else {
      // In production, integrate SSL Wireless, Twilio, or 2Factor here
      // For demonstration, logging fallback
      console.log(`[SMS API] Sending OTP ${rawOtp} to ${phone} via ${provider}`);
    }

    // Return success. In mock mode, we can also include the OTP in the payload
    // for easier manual browser testing, but we should make sure security is respected in production.
    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully.',
      // Only return otp in development/mock mode for testing convenience
      otp: process.env.SMS_PROVIDER === 'mock' || !process.env.SMS_PROVIDER ? rawOtp : undefined,
    });
  } catch (error: any) {
    console.error('Error in send-otp API:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

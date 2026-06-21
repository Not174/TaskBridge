import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { verifyJWT, signJWT } from '@/lib/auth/jose';

export async function POST(req: Request) {
  try {
    const { tempToken, password, confirmPassword } = await req.json();

    // 1. Basic validation
    if (!tempToken || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'Temporary token and password fields are required.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    // 2. Validate temp token
    const payload = await verifyJWT(tempToken);
    if (!payload || payload.type !== 'signup_temp') {
      return NextResponse.json(
        { error: 'Invalid or expired registration session. Please verify OTP again.' },
        { status: 400 }
      );
    }

    const { phone, role } = payload as { phone: string; role: 'POSTER' | 'SEEKER' | 'ADMIN' };

    // 3. Verify if user already exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'An account with this phone number already exists.' },
        { status: 409 }
      );
    }

    // 4. Hash the password (salt rounds = 12)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // 5. Create user
    const [newUser] = await db
      .insert(users)
      .values({
        phone,
        role,
        passwordHash,
        isActive: true,
      })
      .returning();

    // 6. Generate access and refresh JWT tokens
    const accessToken = await signJWT({ id: newUser.id, phone: newUser.phone, role: newUser.role }, '15m');
    const refreshToken = await signJWT({ id: newUser.id, phone: newUser.phone, role: newUser.role }, '7d');

    // 7. Store JWTs in secure HTTP-only cookies
    const cookieStore = await cookies();
    cookieStore.set('tb_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    cookieStore.set('tb_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // Strip passwordHash from user representation
    const { passwordHash: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Error in signup API:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

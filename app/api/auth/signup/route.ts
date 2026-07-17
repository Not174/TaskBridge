import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { verifyJWT, signJWT } from '@/lib/auth/jose';
import { generateUserUniqueId } from '@/lib/auth/id';
import { signupRequestSchema } from '@/lib/validators/signup';

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    // 1. Validate inputs
    const parsed = signupRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request.' },
        { status: 400 }
      );
    }

    const { tempToken, phone, password, confirmPassword } = parsed.data;

    // 2. Password confirmation match
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    // 3. Validate the temp token — must be the email_signup_temp type
    const payload = await verifyJWT(tempToken);
    if (!payload || payload.type !== 'email_signup_temp') {
      return NextResponse.json(
        { error: 'Invalid or expired registration session. Please verify your email again.' },
        { status: 400 }
      );
    }

    const { email, role } = payload as {
      email: string;
      role: 'POSTER' | 'SEEKER';
    };

    // 4. Check for existing accounts with the same email or phone
    const existingUsers = await db
      .select({ id: users.id, email: users.email, phone: users.phone })
      .from(users)
      .where(or(eq(users.email, email), eq(users.phone, phone)))
      .limit(2);

    for (const u of existingUsers) {
      if (u.email === email) {
        return NextResponse.json(
          { error: 'An account with this email address already exists.' },
          { status: 409 }
        );
      }
      if (u.phone === phone) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists.' },
          { status: 409 }
        );
      }
    }

    // 5. Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // 6. Create user — email is now fully verified, phone is the unique login key
    const [newUser] = await db
      .insert(users)
      .values({
        id: generateUserUniqueId(phone, role),
        phone,
        email,
        role,
        passwordHash,
        isActive: true,
      })
      .returning();

    // 7. Generate JWT access + refresh tokens
    const accessToken = await signJWT(
      { id: newUser.id, phone: newUser.phone, role: newUser.role },
      '15m'
    );
    const refreshToken = await signJWT(
      { id: newUser.id, phone: newUser.phone, role: newUser.role },
      '7d'
    );

    // 8. Store JWTs in secure HTTP-only cookies
    const cookieStore = await cookies();
    cookieStore.set('tb_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });
    cookieStore.set('tb_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // Strip sensitive fields
    const { passwordHash: _pw, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      success: true,
      message: 'Account created successfully.',
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('[signup] Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

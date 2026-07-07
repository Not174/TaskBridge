import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db, isDatabaseConfigured } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth/jose';
import { authenticateMockUser, createMockSession } from '@/lib/auth/mock-auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!isDatabaseConfigured() || !db) {
      const { phone, password } = body;
      const user = await authenticateMockUser(phone, password);
      if (!user) {
        return NextResponse.json({ error: 'Invalid phone number or password.' }, { status: 401 });
      }

      const { accessToken, refreshToken } = await createMockSession(user);
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

      return NextResponse.json({ success: true, message: 'Login successful.', user });
    }
    const { phone, email, password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }

    let user;

    // 1. If email is provided, perform Admin lookup
    if (email) {
      const adminUsers = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
        
      if (adminUsers.length === 0) {
        return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
      }
      user = adminUsers[0];

      // Enforce ADMIN role if logging in with email
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Access denied. Unauthorized role.' }, { status: 403 });
      }
    } 
    // 2. If phone is provided, perform Poster/Seeker lookup
    else if (phone) {
      const matchedUsers = await db
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1);
        
      if (matchedUsers.length === 0) {
        return NextResponse.json({ error: 'Invalid phone number or password.' }, { status: 401 });
      }
      user = matchedUsers[0];
    } 
    // 3. Otherwise request credentials
    else {
      return NextResponse.json({ error: 'Phone number or email is required.' }, { status: 400 });
    }

    // 4. Verify password hash using bcrypt
    if (!user.passwordHash) {
      return NextResponse.json({ error: 'Account credentials are not set.' }, { status: 401 });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }

    // 5. Enforce account status check (isActive)
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'This account has been banned or deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // 6. Sign access token (15m) and refresh token (7d)
    const accessToken = await signJWT({ id: user.id, phone: user.phone, role: user.role }, '15m');
    const refreshToken = await signJWT({ id: user.id, phone: user.phone, role: user.role }, '7d');

    // 7. Store tokens in secure HTTP-only cookies
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

    if (user.name) {
      cookieStore.set('tb_profile_complete', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });
    } else {
      cookieStore.delete('tb_profile_complete');
    }

    // Strip password hash before returning user details
    const { passwordHash: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      message: 'Login successful.',
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Error in login API:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

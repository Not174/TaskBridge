import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { users, tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 1. Fetch user by ID
    const matchedUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (matchedUsers.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const user = matchedUsers[0];
    const { passwordHash: _, ...userWithoutPassword } = user;

    // 2. Fetch jobs metrics based on user role
    let stats = {};
    if (user.role === 'POSTER') {
      const posterTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.posterId, userId));

      const totalPosted = posterTasks.length;
      const completed = posterTasks.filter(t => t.status === 'COMPLETED').length;
      const inProgress = posterTasks.filter(t => t.status === 'IN_PROGRESS').length;
      const open = posterTasks.filter(t => t.status === 'OPEN').length;

      stats = { totalPosted, completed, inProgress, open };
    } else if (user.role === 'SEEKER') {
      const seekerTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.seekerId, userId));

      const totalAccepted = seekerTasks.length;
      const completed = seekerTasks.filter(t => t.status === 'COMPLETED').length;
      const ongoing = seekerTasks.filter(t => t.status === 'IN_PROGRESS').length;

      stats = { totalAccepted, completed, ongoing };
    }

    if (user.name) {
      const cookieStore = await cookies();
      cookieStore.set('tb_profile_complete', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });
    }

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      stats,
    });
  } catch (error: any) {
    console.error('Error in GET profile:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, location, additionalPhone, houseAddress } = body;

    // Email validation if email is set
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address format.' }, { status: 400 });
    }

    // Build update parameters dynamically
    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email === '' ? null : email;
    if (location !== undefined) updateFields.location = location;
    if (additionalPhone !== undefined) updateFields.additionalPhone = additionalPhone;
    if (houseAddress !== undefined) updateFields.houseAddress = houseAddress;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
    }

    // Update user record
    try {
      const [updatedUser] = await db
        .update(users)
        .set(updateFields)
        .where(eq(users.id, userId))
        .returning();

      const { passwordHash: _, ...userWithoutPassword } = updatedUser;

      if (updatedUser.name) {
        const cookieStore = await cookies();
        cookieStore.set('tb_profile_complete', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: '/',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully.',
        user: userWithoutPassword,
      });
    } catch (dbError: any) {
      // Handle unique constraint violation for email
      // Drizzle wraps pg errors — check both the error and its cause
      const pgError = dbError.cause || dbError;
      if (pgError.code === '23505' && pgError.constraint?.includes('email')) {
        return NextResponse.json({ error: 'This email address is already in use by another account.' }, { status: 409 });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error('Error in PATCH profile:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

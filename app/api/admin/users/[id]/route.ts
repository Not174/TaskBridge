import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const targetUserId = id;
    const userRole = req.headers.get('x-user-role');
    const adminUserId = req.headers.get('x-user-id');

    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    // Prevent admin self-banning
    if (adminUserId === targetUserId) {
      return NextResponse.json({ error: 'Banning yourself is not allowed.' }, { status: 400 });
    }

    const { isActive } = await req.json();

    if (isActive === undefined) {
      return NextResponse.json({ error: 'isActive status parameter is required.' }, { status: 400 });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ isActive: !!isActive })
      .where(eq(users.id, targetUserId))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      message: `User ${isActive ? 'unbanned' : 'banned'} successfully.`,
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Error in PATCH admin/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const targetUserId = id;
    const userRole = req.headers.get('x-user-role');
    const adminUserId = req.headers.get('x-user-id');

    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    // Prevent admin self-deletion
    if (adminUserId === targetUserId) {
      return NextResponse.json({ error: 'Deleting yourself is not allowed.' }, { status: 400 });
    }

    const deletedUser = await db
      .delete(users)
      .where(eq(users.id, targetUserId))
      .returning();

    if (deletedUser.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully from the platform.',
    });
  } catch (error: any) {
    console.error('Error in DELETE admin/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

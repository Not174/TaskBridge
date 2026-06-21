import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const userRole = req.headers.get('x-user-role');
    
    // Auth Guard: Admin Only (verified by middleware, but double check here)
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    const registeredUsers = await db
      .select({
        id: users.id,
        name: users.name,
        phone: users.phone,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json(registeredUsers);
  } catch (error: any) {
    console.error('Error in GET admin/users:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

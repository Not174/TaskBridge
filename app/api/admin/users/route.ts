import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, tasks } from '@/lib/db/schema';
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
        additionalPhone: users.additionalPhone,
        email: users.email,
        role: users.role,
        profilePicUrl: users.profilePicUrl,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    const allTasks = await db.select().from(tasks);

    // Map tasks to users
    const usersWithStats = registeredUsers.map((user) => {
      let userTasks: typeof allTasks = [];
      if (user.role === 'POSTER') {
        userTasks = allTasks.filter((t) => t.posterId === user.id);
      } else if (user.role === 'SEEKER') {
        userTasks = allTasks.filter((t) => t.seekerId === user.id);
      }

      const activeJobs = userTasks.filter((t) => {
        if (user.role === 'POSTER') {
          return t.status === 'OPEN' || t.status === 'IN_PROGRESS';
        } else {
          return t.status === 'IN_PROGRESS';
        }
      }).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        budget: t.budget,
        location: t.location,
      }));

      const finishedJobs = userTasks.filter((t) => t.status === 'COMPLETED').map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        budget: t.budget,
        location: t.location,
      }));

      return {
        ...user,
        activeJobs,
        finishedJobs,
      };
    });

    return NextResponse.json(usersWithStats);
  } catch (error: any) {
    console.error('Error in GET admin/users:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

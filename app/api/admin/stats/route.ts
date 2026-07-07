import { NextResponse } from 'next/server';
import { db, isDatabaseConfigured } from '@/lib/db';
import { users, tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const userRole = req.headers.get('x-user-role');

    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    if (!isDatabaseConfigured() || !db) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 500 });
    }

    // 1. Fetch all users and tasks to count metrics (efficient for small/medium DBs)
    const allUsers = await db.select({ role: users.role }).from(users);
    const allTasks = await db.select({ status: tasks.status }).from(tasks);

    const totalUsers = allUsers.length;
    const totalPosters = allUsers.filter(u => u.role === 'POSTER').length;
    const totalSeekers = allUsers.filter(u => u.role === 'SEEKER').length;
    const totalAdmins = allUsers.filter(u => u.role === 'ADMIN').length;

    const totalTasks = allTasks.length;
    const activeTasks = allTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const completedTasks = allTasks.filter(t => t.status === 'COMPLETED').length;
    const openTasks = allTasks.filter(t => t.status === 'OPEN').length;

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalPosters,
        totalSeekers,
        totalAdmins,
        totalTasks,
        activeTasks,
        completedTasks,
        openTasks,
      },
    });
  } catch (error: any) {
    console.error('Error in GET admin/stats:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

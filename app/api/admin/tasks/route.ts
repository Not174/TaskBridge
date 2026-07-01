import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, users, applications } from '@/lib/db/schema';
import { eq, desc, aliasedTable } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const userRole = req.headers.get('x-user-role');
    
    // Auth Guard: Admin Only
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    // Alias the users table to handle both Poster and Seeker relations
    const posters = aliasedTable(users, 'posters');
    const seekers = aliasedTable(users, 'seekers');

    const platformTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        category: tasks.category,
        description: tasks.description,
        location: tasks.location,
        budget: tasks.budget,
        deadline: tasks.deadline,
        status: tasks.status,
        progressStep: tasks.progressStep,
        createdAt: tasks.createdAt,
        paymentMethod: tasks.paymentMethod,
        posterId: tasks.posterId,
        posterName: posters.name,
        posterPhone: posters.phone,
        seekerId: tasks.seekerId,
        seekerName: seekers.name,
        seekerPhone: seekers.phone,
      })
      .from(tasks)
      .leftJoin(posters, eq(tasks.posterId, posters.id))
      .leftJoin(seekers, eq(tasks.seekerId, seekers.id))
      .orderBy(desc(tasks.createdAt));

    // Fetch all applications
    const allApplications = await db
      .select({
        id: applications.id,
        taskId: applications.taskId,
        seekerId: applications.seekerId,
        seekerName: users.name,
        seekerPhone: users.phone,
        createdAt: applications.createdAt,
      })
      .from(applications)
      .leftJoin(users, eq(applications.seekerId, users.id));

    // Map applications to tasks
    const tasksWithApplicants = platformTasks.map((task) => {
      const taskApplicants = allApplications.filter((app) => app.taskId === task.id);
      return {
        ...task,
        applicants: taskApplicants,
      };
    });

    return NextResponse.json(tasksWithApplicants);
  } catch (error: any) {
    console.error('Error in GET admin/tasks:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

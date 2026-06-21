import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taskId = id;
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body; // ACCEPT, COMPLETE, CANCEL

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required.' }, { status: 400 });
    }

    // Fetch the target task
    const matchedTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (matchedTasks.length === 0) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    const task = matchedTasks[0];

    // 1. Seeker: Accept Open Task
    if (action === 'ACCEPT') {
      if (userRole !== 'SEEKER') {
        return NextResponse.json({ error: 'Forbidden. Only seeker accounts can accept tasks.' }, { status: 403 });
      }
      if (task.status !== 'OPEN') {
        return NextResponse.json({ error: 'Task is no longer open for bidding.' }, { status: 400 });
      }

      const [updatedTask] = await db
        .update(tasks)
        .set({
          seekerId: userId,
          status: 'IN_PROGRESS',
        })
        .where(eq(tasks.id, taskId))
        .returning();

      return NextResponse.json({ success: true, task: updatedTask });
    }

    // 2. Seeker: Complete Assigned In-Progress Task
    if (action === 'COMPLETE') {
      if (userRole !== 'SEEKER') {
        return NextResponse.json({ error: 'Forbidden. Only seeker accounts can mark tasks complete.' }, { status: 403 });
      }
      if (task.seekerId !== userId) {
        return NextResponse.json({ error: 'Forbidden. You are not assigned to complete this task.' }, { status: 403 });
      }
      if (task.status !== 'IN_PROGRESS') {
        return NextResponse.json({ error: 'Task is not in progress.' }, { status: 400 });
      }

      const [updatedTask] = await db
        .update(tasks)
        .set({
          status: 'COMPLETED',
        })
        .where(eq(tasks.id, taskId))
        .returning();

      return NextResponse.json({ success: true, task: updatedTask });
    }

    // 3. Admin Force-Cancel (or Poster self-cancel if open)
    if (action === 'CANCEL') {
      const isAdmin = userRole === 'ADMIN';
      const isPosterOwner = userRole === 'POSTER' && task.posterId === userId && task.status === 'OPEN';

      if (!isAdmin && !isPosterOwner) {
        return NextResponse.json({ error: 'Forbidden. Unauthorized to cancel this task.' }, { status: 403 });
      }

      const [updatedTask] = await db
        .update(tasks)
        .set({
          status: 'CANCELLED',
        })
        .where(eq(tasks.id, taskId))
        .returning();

      return NextResponse.json({ success: true, task: updatedTask });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in PATCH tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, notifications, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taskId = id;
    const userRole = req.headers.get('x-user-role');

    // Auth Guard: Admin Only
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action'); // 'cancel' or 'delete' (default)

    // 1. Force cancel the task
    if (action === 'cancel') {
      const [updatedTask] = await db
        .update(tasks)
        .set({ status: 'CANCELLED' })
        .where(eq(tasks.id, taskId))
        .returning();

      if (!updatedTask) {
        return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Task force-cancelled successfully.',
        task: updatedTask,
      });
    } 
    // 2. Delete the task record entirely
    else {
      const deleted = await db
        .delete(tasks)
        .where(eq(tasks.id, taskId))
        .returning();

      if (deleted.length === 0) {
        return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Task deleted successfully.',
      });
    }
  } catch (error: any) {
    console.error('Error in DELETE admin/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taskId = id;
    const userRole = req.headers.get('x-user-role');

    // Auth Guard: Admin Only
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Admin role required.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, seekerId } = body;

    if (action === 'ASSIGN_SEEKER') {
      if (!seekerId) {
        return NextResponse.json({ error: 'seekerId is required.' }, { status: 400 });
      }

      // Check current task
      const matched = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (matched.length === 0) {
        return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
      }

      const task = matched[0];
      if (task.status !== 'OPEN') {
        return NextResponse.json({ error: 'Only open tasks can be assigned.' }, { status: 400 });
      }

      // Check how many tasks the seeker is currently assigned to (status is IN_PROGRESS)
      const seekerActiveTasks = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.seekerId, seekerId), eq(tasks.status, 'IN_PROGRESS')));

      if (seekerActiveTasks.length >= 2) {
        return NextResponse.json({
          error: 'This seeker is already assigned to 2 active jobs. They must complete a job before receiving another assignment.',
        }, { status: 400 });
      }

      // Assign the task
      const [updatedTask] = await db
        .update(tasks)
        .set({
          seekerId,
          status: 'IN_PROGRESS',
          progressStep: 'ACCEPTED',
        })
        .where(eq(tasks.id, taskId))
        .returning();

      // Fetch seeker name and phone for response
      const seekerInfo = await db
        .select({ name: users.name, phone: users.phone })
        .from(users)
        .where(eq(users.id, seekerId))
        .limit(1)
        .then((res) => res[0] || null);

      // Notify seeker
      await db.insert(notifications).values({
        userId: seekerId,
        taskId,
        type: 'TASK_ASSIGNED',
        message: `Congratulations! You have been assigned to the task: "${task.title}".`,
      });

      return NextResponse.json({
        success: true,
        message: 'Seeker assigned successfully.',
        task: {
          ...updatedTask,
          seekerName: seekerInfo?.name || 'Verified Seeker',
          seekerPhone: seekerInfo?.phone || '',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in PATCH admin/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

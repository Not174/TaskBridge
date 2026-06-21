import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

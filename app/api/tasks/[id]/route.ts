import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, users, notifications, applications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const taskId = id;
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const matchedTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (matchedTasks.length === 0) {
      return NextResponse.json({ error: 'Task not found.' }, { status: 404 });
    }

    const task = matchedTasks[0];

    const isPoster = task.posterId === userId;
    const isSeeker = task.seekerId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isPoster && !isSeeker && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const poster = await db
      .select({ name: users.name, phone: users.phone })
      .from(users)
      .where(eq(users.id, task.posterId))
      .limit(1)
      .then(res => res[0] || null);

    const seeker = task.seekerId ? await db
      .select({ name: users.name, phone: users.phone })
      .from(users)
      .where(eq(users.id, task.seekerId))
      .limit(1)
      .then(res => res[0] || null) : null;

    // Check if current user has applied to this task
    let hasApplied = false;
    if (userRole === 'SEEKER') {
      const appRecord = await db
        .select()
        .from(applications)
        .where(and(eq(applications.taskId, taskId), eq(applications.seekerId, userId)))
        .limit(1);
      hasApplied = appRecord.length > 0;
    }

    return NextResponse.json({
      success: true,
      task: {
        ...task,
        posterName: poster?.name || 'Verified Client',
        posterPhone: poster?.phone || '',
        seekerName: seeker?.name || null,
        seekerPhone: seeker?.phone || null,
        hasApplied,
      }
    });
  } catch (error: any) {
    console.error('Error in GET tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

const PROGRESS_STEPS = [
  'ACCEPTED',
  'CONTACT_COORDINATION',
  'WORK_IN_PROGRESS',
  'TASK_COMPLETED',
  'PAYMENT_PROCESSING',
  'FINISHED',
  'FEEDBACK',
] as const;

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
    const { action } = body; // APPLY, COMPLETE, CANCEL, ADVANCE_STEP, UPDATE_BUDGET

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

    // 1. Seeker: Apply for Open Task
    if (action === 'APPLY') {
      if (userRole !== 'SEEKER') {
        return NextResponse.json({ error: 'Forbidden. Only seeker accounts can apply for tasks.' }, { status: 403 });
      }
      if (task.status !== 'OPEN') {
        return NextResponse.json({ error: 'Task is no longer open for applications.' }, { status: 400 });
      }

      // Check duplicate application
      const existing = await db
        .select()
        .from(applications)
        .where(and(eq(applications.taskId, taskId), eq(applications.seekerId, userId)))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json({ error: 'You have already applied to this task.' }, { status: 400 });
      }

      await db.insert(applications).values({
        taskId,
        seekerId: userId,
      });

      return NextResponse.json({ success: true, message: 'Application submitted successfully.' });
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
          progressStep: 'TASK_COMPLETED',
        })
        .where(eq(tasks.id, taskId))
        .returning();

      // Vanish applications
      await db.delete(applications).where(eq(applications.taskId, taskId));

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

      // Vanish applications
      await db.delete(applications).where(eq(applications.taskId, taskId));

      return NextResponse.json({ success: true, task: updatedTask });
    }

    // 4. Advance Progress Step
    if (action === 'ADVANCE_STEP') {
      const isAdmin = userRole === 'ADMIN';

      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden. Only administrators can advance task progress.' }, { status: 403 });
      }

      const currentStepIndex = PROGRESS_STEPS.indexOf(task.progressStep as typeof PROGRESS_STEPS[number]);
      if (currentStepIndex === -1 || currentStepIndex >= PROGRESS_STEPS.length - 1) {
        return NextResponse.json({ error: 'Cannot advance further. Already at the final step.' }, { status: 400 });
      }

      const nextStep = PROGRESS_STEPS[currentStepIndex + 1];

      // Auto-update task status based on certain transitions
      const statusUpdates: any = { progressStep: nextStep };
      if (nextStep === 'TASK_COMPLETED') {
        statusUpdates.status = 'COMPLETED';
      } else if (nextStep === 'FINISHED' || nextStep === 'FEEDBACK') {
        statusUpdates.status = 'COMPLETED';
      }

      const [updatedTask] = await db
        .update(tasks)
        .set(statusUpdates)
        .where(eq(tasks.id, taskId))
        .returning();

      if (statusUpdates.status === 'COMPLETED') {
        // Vanish applications
        await db.delete(applications).where(eq(applications.taskId, taskId));
      }

      return NextResponse.json({ success: true, task: updatedTask });
    }

    // 5. Update Task Budget (Poster once, Admin multiple times)
    if (action === 'UPDATE_BUDGET') {
      const { budget } = body;
      const parsedBudget = parseFloat(budget);

      if (isNaN(parsedBudget) || parsedBudget <= 0) {
        return NextResponse.json({ error: 'Valid positive budget is required.' }, { status: 400 });
      }

      if (userRole === 'ADMIN') {
        const [updatedTask] = await db
          .update(tasks)
          .set({ budget: parsedBudget })
          .where(eq(tasks.id, taskId))
          .returning();

        // Notify seeker if assigned
        if (updatedTask.seekerId) {
          await db.insert(notifications).values({
            userId: updatedTask.seekerId,
            taskId: updatedTask.id,
            type: 'BUDGET_CHANGED',
            message: `The admin has updated the budget for task "${updatedTask.title}" to ${parsedBudget.toLocaleString()} BDT.`,
          });
        }

        return NextResponse.json({ success: true, task: updatedTask });
      } else if (userRole === 'POSTER') {
        if (task.posterId !== userId) {
          return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
        }
        if (task.budgetChangedByPoster) {
          return NextResponse.json({ error: 'You can only edit the task budget once.' }, { status: 400 });
        }

        const [updatedTask] = await db
          .update(tasks)
          .set({
            budget: parsedBudget,
            budgetChangedByPoster: true,
          })
          .where(eq(tasks.id, taskId))
          .returning();

        return NextResponse.json({ success: true, task: updatedTask });
      } else {
        return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
      }
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in PATCH tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

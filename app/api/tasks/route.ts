import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, users, applications } from '@/lib/db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { generateTaskId } from '@/lib/auth/id';

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 1. Poster: Fetch tasks posted by the user, joining seeker names if assigned
    if (userRole === 'POSTER') {
      const posterTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          category: tasks.category,
          description: tasks.description,
          location: tasks.location,
          budget: tasks.budget,
          deadline: tasks.deadline,
          status: tasks.status,
          paymentMethod: tasks.paymentMethod,
          progressStep: tasks.progressStep,
          createdAt: tasks.createdAt,
          seekerId: tasks.seekerId,
          seekerName: users.name,
          seekerPhone: users.phone,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.seekerId, users.id))
        .where(eq(tasks.posterId, userId))
        .orderBy(desc(tasks.createdAt));

      return NextResponse.json(posterTasks);
    } 
    // 2. Seeker: Browse tasks. Can fetch own accepted tasks (type=my) or open tasks (type=all/default)
    else if (userRole === 'SEEKER') {
      const { searchParams } = new URL(req.url);
      const type = searchParams.get('type'); // 'my' or 'all'

      if (type === 'my') {
        const myTasks = await db
          .select({
            id: tasks.id,
            title: tasks.title,
            category: tasks.category,
            description: tasks.description,
            location: tasks.location,
            budget: tasks.budget,
            deadline: tasks.deadline,
            status: tasks.status,
            paymentMethod: tasks.paymentMethod,
            progressStep: tasks.progressStep,
            createdAt: tasks.createdAt,
            posterId: tasks.posterId,
            posterName: users.name,
          })
          .from(tasks)
          .leftJoin(users, eq(tasks.posterId, users.id))
          .where(eq(tasks.seekerId, userId))
          .orderBy(desc(tasks.createdAt));

        return NextResponse.json(myTasks);
      }

      const category = searchParams.get('category');
      const location = searchParams.get('location');
      const minBudget = searchParams.get('minBudget');
      const maxBudget = searchParams.get('maxBudget');

      const conditions = [eq(tasks.status, 'OPEN')];

      if (category && category !== 'All') {
        conditions.push(eq(tasks.category, category));
      }
      if (location && location.trim() !== '') {
        // Simple case-insensitive or direct match, we will do direct comparison for SQLite/Postgres compatibility
        conditions.push(eq(tasks.location, location));
      }
      if (minBudget) {
        const parsedMin = parseFloat(minBudget);
        if (!isNaN(parsedMin)) {
          conditions.push(gte(tasks.budget, parsedMin));
        }
      }
      if (maxBudget) {
        const parsedMax = parseFloat(maxBudget);
        if (!isNaN(parsedMax)) {
          conditions.push(lte(tasks.budget, parsedMax));
        }
      }

      const openTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          category: tasks.category,
          description: tasks.description,
          location: tasks.location,
          budget: tasks.budget,
          deadline: tasks.deadline,
          status: tasks.status,
          paymentMethod: tasks.paymentMethod,
          progressStep: tasks.progressStep,
          createdAt: tasks.createdAt,
          posterId: tasks.posterId,
          posterName: users.name,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.posterId, users.id))
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt));

      // Fetch user's applications
      const seekerApplications = await db
        .select()
        .from(applications)
        .where(eq(applications.seekerId, userId));

      const appTaskIds = new Set(seekerApplications.map((app) => app.taskId));

      const tasksWithApplyStatus = openTasks.map((task) => ({
        ...task,
        hasApplied: appTaskIds.has(task.id),
      }));

      return NextResponse.json(tasksWithApplyStatus);
    }

    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  } catch (error: any) {
    console.error('Error in GET tasks:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Role guard: Only Posters can create tasks
    if (userRole !== 'POSTER') {
      return NextResponse.json({ error: 'Forbidden. Only poster accounts can create tasks.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, category, description, location, budget, deadline, paymentMethod } = body;

    // Validation
    if (!title || !category || !description || !location || budget === undefined || !deadline) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const parsedBudget = parseFloat(budget);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      return NextResponse.json({ error: 'Budget must be a positive number.' }, { status: 400 });
    }

    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDeadline.getTime()) || parsedDeadline < new Date()) {
      return NextResponse.json({ error: 'Deadline must be a valid future date.' }, { status: 400 });
    }

    // Validate payment method
    const validPaymentMethods = ['ONLINE_PAYMENT', 'BANK_TRANSFER', 'CASH_ON_HAND'];
    const finalPaymentMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : 'CASH_ON_HAND';

    // Save task to DB
    const [newTask] = await db
      .insert(tasks)
      .values({
        id: generateTaskId(),
        posterId: userId,
        title,
        category,
        description,
        location,
        budget: parsedBudget,
        deadline: parsedDeadline,
        status: 'OPEN',
        paymentMethod: finalPaymentMethod,
        progressStep: 'POSTED',
      })
      .returning();

    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST tasks:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

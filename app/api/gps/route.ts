import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gpsLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Role guard: Only Seekers can submit coordinates
    if (userRole !== 'SEEKER') {
      return NextResponse.json({ error: 'Forbidden. Only seeker accounts can report GPS telemetry.' }, { status: 403 });
    }

    const { latitude, longitude } = await req.json();

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'Latitude and longitude parameters are required.' }, { status: 400 });
    }

    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      return NextResponse.json({ error: 'Invalid coordinates formats.' }, { status: 400 });
    }

    // Save GPS log in database
    const [newLog] = await db
      .insert(gpsLogs)
      .values({
        seekerId: userId,
        latitude: parsedLat,
        longitude: parsedLng,
      })
      .returning();

    return NextResponse.json({ success: true, log: newLog }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST gps:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    if (!userId || !userRole) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Role guard: Only Posters and Admins can query GPS telemetry
    if (userRole !== 'POSTER' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Only posters and admins can view GPS tracking.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const seekerId = searchParams.get('seekerId');

    if (!seekerId) {
      return NextResponse.json({ error: 'seekerId query parameter is required.' }, { status: 400 });
    }

    // Fetch the latest telemetry point for the seeker
    const logs = await db
      .select()
      .from(gpsLogs)
      .where(eq(gpsLogs.seekerId, seekerId))
      .orderBy(desc(gpsLogs.recordedAt))
      .limit(1);

    if (logs.length === 0) {
      return NextResponse.json({ error: 'No GPS logs found for this seeker.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      log: logs[0],
    });
  } catch (error: any) {
    console.error('Error in GET gps:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

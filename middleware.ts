import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/auth/jose';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Define route categories
  const isPosterRoute = path.startsWith('/poster');
  const isSeekerRoute = path.startsWith('/seeker');
  const isAdminRoute = path.startsWith('/admin') && path !== '/admin/login';
  
  // APIs
  const isProtectedApi = path.startsWith('/api/') && 
    !path.startsWith('/api/auth') && 
    path !== '/api/gps'; // Handle custom auth inside public API if needed, otherwise protect here.
    
  // If this route does not require protection, proceed
  if (!isPosterRoute && !isSeekerRoute && !isAdminRoute && !isProtectedApi) {
    return NextResponse.next();
  }

  // Retrieve token
  const token = req.cookies.get('tb_access_token')?.value;

  if (!token) {
    if (isProtectedApi) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized. Token missing.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const loginUrl = isAdminRoute ? new URL('/admin/login', req.url) : new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT token
  const payload = await verifyJWT(token);
  if (!payload) {
    if (isProtectedApi) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized. Invalid or expired token.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const loginUrl = isAdminRoute ? new URL('/admin/login', req.url) : new URL('/login', req.url);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.delete('tb_access_token');
    res.cookies.delete('tb_refresh_token');
    return res;
  }

  const userRole = payload.role as string;
  const userId = payload.id as string;
  const userPhone = payload.phone as string;

  // Verify path authorization
  if (isPosterRoute && userRole !== 'POSTER') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isSeekerRoute && userRole !== 'SEEKER') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAdminRoute && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  // Protect specific admin API routes
  if (path.startsWith('/api/admin') && userRole !== 'ADMIN') {
    return new NextResponse(JSON.stringify({ error: 'Forbidden. Admin role required.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Inject authentication parameters into request headers for API endpoints
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', userId);
  requestHeaders.set('x-user-role', userRole);
  requestHeaders.set('x-user-phone', userPhone);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/poster/:path*',
    '/seeker/:path*',
    '/admin/:path*',
    '/api/:path*',
  ],
};

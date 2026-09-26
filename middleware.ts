import { NextResponse, type NextRequest } from 'next/server';
// Pages and actions verify the Appwrite session and role before private SQL.
export function middleware(request: NextRequest) {
  if (!request.cookies.has('workshop_session') && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/v/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|del-rey-logo.png).*)'] };

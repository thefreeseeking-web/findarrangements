import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // This refreshes the session cookie if it's close to expiring,
  // so users stay logged in across visits instead of silently
  // getting signed out when their access token expires.
  await supabase.auth.getSession();

  return res;
}

export const config = {
  matcher: [
    /*
     * Run on every route except static files and images,
     * so the session stays fresh across the whole site.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

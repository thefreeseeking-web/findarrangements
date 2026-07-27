import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

// This client runs in the browser and automatically handles the logged-in
// user's session (cookies) so every request is scoped to them.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

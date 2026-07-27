import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// This client runs in the browser and automatically handles the logged-in
// user's session (cookies) so every request is scoped to them.
export function createClient() {
  return createClientComponentClient();
}

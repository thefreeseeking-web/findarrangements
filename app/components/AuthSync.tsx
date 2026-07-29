'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

// This component doesn't render anything visible — it just needs to exist
// somewhere on every page so the Supabase client initializes and can catch
// the login tokens that arrive in the URL right after someone clicks an
// email confirmation link. Without this, those tokens get silently dropped
// and the person appears logged out even though confirmation succeeded.
export default function AuthSync() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      const justConfirmed =
        typeof window !== 'undefined' && window.location.hash.includes('access_token');

      if (event === 'SIGNED_IN' && justConfirmed) {
        router.replace('/profile/setup');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return null;
}

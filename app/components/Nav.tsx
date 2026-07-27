'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function Nav() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <nav className="flex items-center justify-between max-w-5xl mx-auto mb-10 flex-wrap gap-3 px-6 pt-6">
      <Link href="/browse" className="font-display text-xl" style={{ color: 'var(--cream)' }}>
        FindArrangements
      </Link>
      <div className="flex items-center gap-5 text-sm">
        <Link href="/browse" style={{ color: 'var(--muted)' }}>Browse</Link>
        <Link href="/messages" style={{ color: 'var(--muted)' }}>Messages</Link>
        <Link href="/profile/edit" style={{ color: 'var(--muted)' }}>Edit Profile</Link>
        <button onClick={handleLogout} style={{ color: 'var(--gold)' }}>
          Log Out
        </button>
      </div>
    </nav>
  );
}

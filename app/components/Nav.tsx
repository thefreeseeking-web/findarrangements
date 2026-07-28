'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function Nav() {
  const router = useRouter();
  const supabase = createClient();

  const [myId, setMyId] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [newLikes, setNewLikes] = useState(0);
  const [newViews, setNewViews] = useState(0);
  const [newViews, setNewViews] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      setMyId(authData.user.id);

      // Unread messages: messages in my matches sent by the other person, not yet read
      const { data: myMatches } = await supabase
        .from('matches')
        .select('id')
        .or(`profile_one_id.eq.${authData.user.id},profile_two_id.eq.${authData.user.id}`);

      const matchIds = (myMatches ?? []).map((m) => m.id);
      if (matchIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('match_id', matchIds)
          .neq('sender_id', authData.user.id)
          .eq('read', false);
        setUnreadMessages(count ?? 0);
      }

      // New likes: people who liked me that I haven't seen yet
      const { count: likeCount } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('liked_id', authData.user.id)
        .eq('seen', false);
      setNewLikes(likeCount ?? 0);

      const { count: viewCount } = await supabase
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('viewed_id', authData.user.id)
        .eq('seen', false);
      setNewViews(viewCount ?? 0);
    }
    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <nav className="flex items-center justify-between max-w-5xl mx-auto mb-6 sm:mb-10 flex-wrap gap-x-4 gap-y-2 px-4 sm:px-6 pt-4 sm:pt-6">
      <Link href="/browse" className="font-display text-lg sm:text-xl" style={{ color: 'var(--cream)' }}>
        FindArrangements
      </Link>
      <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm flex-wrap">
        <Link href="/browse" style={{ color: 'var(--muted)' }}>Browse</Link>

        <Link href="/views" className="inline-flex items-center gap-1" style={{ color: 'var(--muted)' }}>
          Views
          {newViews > 0 && (
            <span
              className="text-[10px] rounded-full px-1.5 py-0.5 font-bold leading-none"
              style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
            >
              {newViews}
            </span>
          )}
        </Link>

        <Link href="/likes" className="inline-flex items-center gap-1" style={{ color: 'var(--muted)' }}>
          Likes
          {newLikes > 0 && (
            <span
              className="text-[10px] rounded-full px-1.5 py-0.5 font-bold leading-none"
              style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
            >
              {newLikes}
            </span>
          )}
        </Link>

        <Link href="/views" className="inline-flex items-center gap-1" style={{ color: 'var(--muted)' }}>
          Views
          {newViews > 0 && (
            <span
              className="text-[10px] rounded-full px-1.5 py-0.5 font-bold leading-none"
              style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
            >
              {newViews}
            </span>
          )}
        </Link>

        <Link href="/messages" className="inline-flex items-center gap-1" style={{ color: 'var(--muted)' }}>
          Messages
          {unreadMessages > 0 && (
            <span
              className="text-[10px] rounded-full px-1.5 py-0.5 font-bold leading-none"
              style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
            >
              {unreadMessages}
            </span>
          )}
        </Link>

        {myId && (
          <Link href={`/profile/${myId}`} style={{ color: 'var(--muted)' }}>My Profile</Link>
        )}
        <Link href="/profile/edit" style={{ color: 'var(--muted)' }}>Edit Profile</Link>
        <button onClick={handleLogout} style={{ color: 'var(--gold)' }}>
          Log Out
        </button>
      </div>
    </nav>
  );
}

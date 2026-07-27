'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import Nav from '../components/Nav';

type MatchRow = {
  matchId: string;
  otherId: string;
  otherName: string;
  otherRole: string;
  photoUrl: string | null;
  lastMessage: string | null;
  hasUnread: boolean;
};

const roleLabel: Record<string, string> = {
  sugar_baby: 'Sugar Baby',
  sugar_daddy: 'Sugar Daddy',
  sugar_mommy: 'Sugar Mommy',
};

export default function MessagesListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [myId, setMyId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.push('/login');
      return;
    }
    const myUserId = authData.user.id;
    setMyId(myUserId);

    const { data: matchRows } = await supabase
      .from('matches')
      .select('id, profile_one_id, profile_two_id')
      .or(`profile_one_id.eq.${myUserId},profile_two_id.eq.${myUserId}`);

    const results = await Promise.all(
      (matchRows ?? []).map(async (m) => {
        const otherId = m.profile_one_id === myUserId ? m.profile_two_id : m.profile_one_id;

        const { data: otherProfile } = await supabase
          .from('profiles')
          .select('display_name, role')
          .eq('id', otherId)
          .maybeSingle();

        const { data: photoRow } = await supabase
          .from('photos')
          .select('storage_path')
          .eq('profile_id', otherId)
          .eq('is_primary', true)
          .eq('moderation_status', 'approved')
          .maybeSingle();

        let photoUrl: string | null = null;
        if (photoRow) {
          const { data: signed } = await supabase.storage
            .from('photos')
            .createSignedUrl(photoRow.storage_path, 3600);
          photoUrl = signed?.signedUrl ?? null;
        }

        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content')
          .eq('match_id', m.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unreadCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('match_id', m.id)
          .neq('sender_id', myUserId)
          .eq('read', false);

        return {
          matchId: m.id,
          otherId,
          otherName: otherProfile?.display_name ?? 'Member',
          otherRole: otherProfile?.role ?? '',
          photoUrl,
          lastMessage: lastMsg?.content ?? null,
          hasUnread: (unreadCount ?? 0) > 0,
        };
      })
    );

    setMatches(results);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(matchId: string, myUserId: string) {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('match_id', matchId)
      .neq('sender_id', myUserId);
    load();
  }

  async function markUnread(matchId: string, myUserId: string) {
    await supabase
      .from('messages')
      .update({ read: false })
      .eq('match_id', matchId)
      .neq('sender_id', myUserId);
    load();
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading matches...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 pb-12" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <Nav />
      <h1 className="font-display text-3xl mb-8 text-center" style={{ color: 'var(--cream)' }}>
        Messages
      </h1>

      {matches.length === 0 ? (
        <p className="text-center" style={{ color: 'var(--muted)' }}>
          No matches yet — go like some profiles in{' '}
          <Link href="/browse" style={{ color: 'var(--gold)' }}>Browse</Link>.
        </p>
      ) : (
        <div className="max-w-lg mx-auto space-y-3">
          {matches.map((m) => (
            <div
              key={m.matchId}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <Link href={`/messages/${m.matchId}`} className="flex items-center gap-4 flex-1 overflow-hidden">
                <div
                  className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 relative"
                  style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                >
                  {m.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photoUrl} alt={m.otherName} className="w-full h-full object-cover" />
                  )}
                  {m.hasUnread && (
                    <span
                      className="absolute top-0 right-0 w-3 h-3 rounded-full border-2"
                      style={{ backgroundColor: 'var(--gold)', borderColor: 'var(--surface)' }}
                    />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold" style={{ color: 'var(--cream)' }}>
                      {m.otherName}
                    </p>
                    <span className="text-xs" style={{ color: 'var(--gold)' }}>
                      {roleLabel[m.otherRole] ?? m.otherRole}
                    </span>
                  </div>
                  <p
                    className="text-sm truncate"
                    style={{ color: m.hasUnread ? 'var(--cream)' : 'var(--muted)', fontWeight: m.hasUnread ? 600 : 400 }}
                  >
                    {m.lastMessage ?? 'Say hello!'}
                  </p>
                </div>
              </Link>
              {myId && (
                <button
                  onClick={() => (m.hasUnread ? markRead(m.matchId, myId) : markUnread(m.matchId, myId))}
                  className="text-xs flex-shrink-0"
                  style={{ color: 'var(--muted)' }}
                >
                  {m.hasUnread ? 'Mark read' : 'Mark unread'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

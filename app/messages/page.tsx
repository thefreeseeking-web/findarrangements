'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import Nav from '../components/Nav';
import ChatThread from '../components/ChatThread';

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

function MessagesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [myId, setMyId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(searchParams.get('open'));

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

  function openChat(matchId: string) {
    setSelected(matchId);
    // Mark that conversation's unread dot as cleared right away in the sidebar
    setMatches((prev) => prev.map((m) => (m.matchId === matchId ? { ...m, hasUnread: false } : m)));
  }

  async function markRead(matchId: string, myUserId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await supabase.from('messages').update({ read: true }).eq('match_id', matchId).neq('sender_id', myUserId);
    load();
  }

  async function markUnread(matchId: string, myUserId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await supabase.from('messages').update({ read: false }).eq('match_id', matchId).neq('sender_id', myUserId);
    load();
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading matches...</p>
      </main>
    );
  }

  const selectedMatch = matches.find((m) => m.matchId === selected);

  return (
    <main className="flex flex-col" style={{ backgroundColor: 'var(--bg-deep)', height: '100dvh' }}>
      <div className="flex-shrink-0">
        <Nav />
      </div>

      <div className="flex-1 min-h-0 max-w-5xl w-full mx-auto flex border-t border-white/10 rounded-t-2xl overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
        {/* CONVERSATION LIST — always visible on desktop, hidden on mobile once a chat is open */}
        <div
          className={`w-full sm:w-80 flex-shrink-0 border-r border-white/10 overflow-y-auto ${selected ? 'hidden sm:block' : 'block'}`}
        >
          {matches.length === 0 ? (
            <p className="text-sm p-6 text-center" style={{ color: 'var(--muted)' }}>
              No matches yet — go like some profiles in{' '}
              <Link href="/browse" style={{ color: 'var(--gold)' }}>Browse</Link>.
            </p>
          ) : (
            matches.map((m) => (
              <button
                key={m.matchId}
                onClick={() => openChat(m.matchId)}
                className="w-full flex items-center gap-3 p-4 text-left border-b border-white/5 hover:bg-white/5"
                style={{ backgroundColor: selected === m.matchId ? 'rgba(201,163,95,0.1)' : 'transparent' }}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 relative" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  {m.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photoUrl} alt={m.otherName} className="w-full h-full object-cover object-top" />
                  )}
                  {m.hasUnread && (
                    <span className="absolute top-0 right-0 w-3 h-3 rounded-full border-2" style={{ backgroundColor: 'var(--gold)', borderColor: 'var(--surface)' }} />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm" style={{ color: 'var(--cream)' }}>{m.otherName}</p>
                    <span className="text-[10px]" style={{ color: 'var(--gold)' }}>{roleLabel[m.otherRole] ?? m.otherRole}</span>
                  </div>
                  <p
                    className="text-xs truncate"
                    style={{ color: m.hasUnread ? 'var(--cream)' : 'var(--muted)', fontWeight: m.hasUnread ? 600 : 400 }}
                  >
                    {m.lastMessage ?? 'Say hello!'}
                  </p>
                </div>
                {myId && (
                  <span
                    onClick={(e) => (m.hasUnread ? markRead(m.matchId, myId, e) : markUnread(m.matchId, myId, e))}
                    className="text-[10px] flex-shrink-0"
                    style={{ color: 'var(--muted)' }}
                  >
                    {m.hasUnread ? 'Read' : 'Unread'}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* OPEN CHAT — full width on mobile once selected, side panel on desktop */}
        <div className={`flex-1 flex flex-col min-h-0 ${selected ? 'flex' : 'hidden sm:flex'}`}>
          {selectedMatch ? (
            <ChatThread
              key={selectedMatch.matchId}
              matchId={selectedMatch.matchId}
              onBack={() => setSelected(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p style={{ color: 'var(--muted)' }}>Select a conversation to start chatting.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function MessagesListPage() {
  return (
    <Suspense fallback={null}>
      <MessagesInner />
    </Suspense>
  );
}

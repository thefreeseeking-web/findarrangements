'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export default function ChatThreadPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;
  const supabase = createClient();

  const [myId, setMyId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState('Member');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push('/login');
        return;
      }
      setMyId(authData.user.id);

      // Confirm this match belongs to me, and figure out who the other person is
      const { data: matchRow } = await supabase
        .from('matches')
        .select('profile_one_id, profile_two_id')
        .eq('id', matchId)
        .maybeSingle();

      if (
        !matchRow ||
        (matchRow.profile_one_id !== authData.user.id && matchRow.profile_two_id !== authData.user.id)
      ) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);

      const otherId =
        matchRow.profile_one_id === authData.user.id ? matchRow.profile_two_id : matchRow.profile_one_id;

      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', otherId)
        .maybeSingle();
      setOtherName(otherProfile?.display_name ?? 'Member');

      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      setMessages(existingMessages ?? []);
      setLoading(false);
    }

    load();
  }, [matchId]);

  // Realtime subscription: new messages appear instantly for both people
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!myId || !newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');

    await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: myId,
      content,
    });
    // No need to manually add to state — the realtime subscription above
    // will pick up our own insert too and add it automatically.
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading conversation...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p style={{ color: 'var(--muted)' }}>You don't have access to this conversation.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <Link href="/messages" style={{ color: 'var(--muted)' }}>←</Link>
        <h1 className="font-display text-xl" style={{ color: 'var(--cream)' }}>{otherName}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3 max-w-2xl w-full mx-auto">
        {messages.length === 0 && (
          <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
            Say hello to {otherName}!
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-xs px-4 py-2 rounded-2xl text-sm"
                style={{
                  backgroundColor: mine ? 'var(--gold)' : 'var(--surface)',
                  color: mine ? '#1a1014' : 'var(--cream)',
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="px-6 py-4 border-t border-white/10 flex gap-3 max-w-2xl w-full mx-auto">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full px-4 py-2.5 bg-white/5 border border-white/10"
          style={{ color: 'var(--cream)' }}
        />
        <button
          type="submit"
          className="px-6 py-2.5 rounded-full font-semibold"
          style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
        >
          Send
        </button>
      </form>
    </main>
  );
}

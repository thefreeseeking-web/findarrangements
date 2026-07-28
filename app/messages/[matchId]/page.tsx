'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import Nav from '../../components/Nav';

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
  const [otherId, setOtherId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState('Member');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendTypingThrottle = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push('/login');
        return;
      }
      setMyId(authData.user.id);

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

      const otherUserId =
        matchRow.profile_one_id === authData.user.id ? matchRow.profile_two_id : matchRow.profile_one_id;
      setOtherId(otherUserId);

      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', otherUserId)
        .maybeSingle();
      setOtherName(otherProfile?.display_name ?? 'Member');

      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      setMessages(existingMessages ?? []);
      setLoading(false);

      await supabase
        .from('messages')
        .update({ read: true })
        .eq('match_id', matchId)
        .neq('sender_id', authData.user.id)
        .eq('read', false);
    }

    load();
  }, [matchId]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as Message).id));
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === myId) return;
        setOtherTyping(true);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setOtherTyping(false), 2500);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, myId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);

  function handleTyping(value: string) {
    setNewMessage(value);
    if (!myId || !channelRef.current) return;

    // Throttle so we don't spam broadcasts on every keystroke
    if (sendTypingThrottle.current) return;
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: myId } });
    sendTypingThrottle.current = setTimeout(() => {
      sendTypingThrottle.current = null;
    }, 1200);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!myId || !newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');

    // Show it immediately for the sender, don't wait on the realtime round-trip
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      sender_id: myId,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    const { data: inserted, error: insertError } = await supabase
      .from('messages')
      .insert({ match_id: matchId, sender_id: myId, content })
      .select()
      .single();

    if (insertError) {
      // Roll back the optimistic bubble if the send actually failed
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }

    // Swap the temp bubble for the real row (real id, matches what realtime will send)
    setMessages((prev) => prev.map((m) => (m.id === tempId ? (inserted as Message) : m)));
  }

  async function handleDelete(messageId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    await supabase.from('messages').delete().eq('id', messageId);
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
    <main className="flex flex-col" style={{ backgroundColor: 'var(--bg-deep)', height: '100dvh' }}>
      <div className="flex-shrink-0">
        <Nav />
      </div>
      <div className="px-4 sm:px-6 pb-3 flex items-center gap-3 max-w-2xl w-full mx-auto flex-shrink-0">
        <Link href="/messages" style={{ color: 'var(--muted)' }}>←</Link>
        {otherId && (
          <Link href={`/profile/${otherId}`} className="font-display text-lg sm:text-xl" style={{ color: 'var(--cream)' }}>
            {otherName}
          </Link>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2 max-w-2xl w-full mx-auto">
        {messages.length === 0 && (
          <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
            Say hello to {otherName}!
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} group`}>
              {mine && (
                <button
                  onClick={() => handleDelete(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs mr-2 self-center flex-shrink-0"
                  style={{ color: 'var(--muted)' }}
                  title="Delete message"
                >
                  🗑
                </button>
              )}
              <div
                className="max-w-[75%] sm:max-w-xs px-4 py-2 rounded-2xl text-sm break-words"
                style={{
                  backgroundColor: mine ? 'var(--gold)' : 'var(--surface)',
                  color: mine ? '#1a1014' : 'var(--cream)',
                }}
              >
                {m.content}
                <div
                  className="text-[10px] mt-1 opacity-60"
                  style={{ color: mine ? '#1a1014' : 'var(--muted)' }}
                >
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start">
            <div
              className="px-4 py-2 rounded-2xl text-sm italic"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--muted)' }}
            >
              {otherName} is typing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        className="px-4 sm:px-6 py-3 border-t border-white/10 flex gap-2 sm:gap-3 max-w-2xl w-full mx-auto flex-shrink-0"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full px-4 py-2.5 bg-white/5 border border-white/10 text-sm"
          style={{ color: 'var(--cream)' }}
        />
        <button
          type="submit"
          className="px-5 sm:px-6 py-2.5 rounded-full font-semibold text-sm"
          style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
        >
          Send
        </button>
      </form>
    </main>
  );
}

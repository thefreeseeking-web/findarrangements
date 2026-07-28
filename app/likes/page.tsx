'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import Nav from '../components/Nav';

type Liker = {
  id: string;
  likeId: string;
  display_name: string;
  role: string;
  photoUrl: string | null;
};

const roleLabel: Record<string, string> = {
  sugar_baby: 'Sugar Baby',
  sugar_daddy: 'Sugar Daddy',
  sugar_mommy: 'Sugar Mommy',
};

export default function LikesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [likers, setLikers] = useState<Liker[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [likedBack, setLikedBack] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push('/login');
        return;
      }
      setMyId(authData.user.id);

      const { data: likeRows } = await supabase
        .from('likes')
        .select('id, liker_id')
        .eq('liked_id', authData.user.id)
        .order('created_at', { ascending: false });

      const results = await Promise.all(
        (likeRows ?? []).map(async (l) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, role')
            .eq('id', l.liker_id)
            .maybeSingle();

          const { data: photoRow } = await supabase
            .from('photos')
            .select('storage_path')
            .eq('profile_id', l.liker_id)
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

          return {
            id: l.liker_id,
            likeId: l.id,
            display_name: profile?.display_name ?? 'Member',
            role: profile?.role ?? '',
            photoUrl,
          };
        })
      );

      setLikers(results);
      setLoading(false);

      // Mark all as seen now that the user is viewing this page
      await supabase.from('likes').update({ seen: true }).eq('liked_id', authData.user.id).eq('seen', false);
    }

    load();
  }, []);

  async function handleLikeBack(otherId: string) {
    if (!myId) return;
    setLikedBack((prev) => new Set(prev).add(otherId));
    await supabase.from('likes').insert({ liker_id: myId, liked_id: otherId });
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 pb-12" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <Nav />
      <h1 className="font-display text-2xl sm:text-3xl mb-8 text-center" style={{ color: 'var(--cream)' }}>
        People Who Liked You
      </h1>

      {likers.length === 0 ? (
        <p className="text-center" style={{ color: 'var(--muted)' }}>
          No likes yet — the more complete your profile, the more likes you'll get!
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {likers.map((l) => (
            <div
              key={l.likeId}
              className="rounded-2xl overflow-hidden shadow-lg flex flex-col"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Link href={`/profile/${l.id}`} className="h-48 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {l.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.photoUrl} alt={l.display_name} className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: 'var(--muted)' }}>No photo yet</span>
                )}
              </Link>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Link href={`/profile/${l.id}`} className="font-semibold" style={{ color: 'var(--cream)' }}>
                    {l.display_name}
                  </Link>
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--berry)', color: 'var(--cream)' }}>
                    {roleLabel[l.role] ?? l.role}
                  </span>
                </div>
                <button
                  onClick={() => handleLikeBack(l.id)}
                  disabled={likedBack.has(l.id)}
                  className="w-full py-2 rounded-full font-semibold text-sm disabled:opacity-50"
                  style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
                >
                  {likedBack.has(l.id) ? 'Liked Back — Check Messages!' : 'Like Back'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

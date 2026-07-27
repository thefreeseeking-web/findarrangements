'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

type Profile = {
  id: string;
  display_name: string;
  role: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  photoUrl: string | null;
};

export default function BrowsePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push('/login');
        return;
      }
      setUserId(authData.user.id);

      // Get profiles other than my own
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, role, bio, city, country')
        .neq('id', authData.user.id)
        .limit(50);

      if (profilesError) {
        setError(profilesError.message);
        setLoading(false);
        return;
      }

      // Get my existing likes so we can grey out already-liked profiles
      const { data: myLikes } = await supabase
        .from('likes')
        .select('liked_id')
        .eq('liker_id', authData.user.id);

      setLikedIds(new Set((myLikes ?? []).map((l) => l.liked_id)));

      // For each profile, fetch their primary approved photo (if any) as a signed URL
      const withPhotos = await Promise.all(
        (profilesData ?? []).map(async (p) => {
          const { data: photoRow } = await supabase
            .from('photos')
            .select('storage_path')
            .eq('profile_id', p.id)
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

          return { ...p, photoUrl };
        })
      );

      setProfiles(withPhotos);
      setLoading(false);
    }

    load();
  }, []);

  async function handleLike(likedId: string) {
    if (!userId) return;

    // Optimistically mark as liked
    setLikedIds((prev) => new Set(prev).add(likedId));

    const { error: likeError } = await supabase.from('likes').insert({
      liker_id: userId,
      liked_id: likedId,
    });

    if (likeError) {
      // Roll back on failure
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(likedId);
        return next;
      });
    }
  }

  const roleLabel: Record<string, string> = {
    sugar_baby: 'Sugar Baby',
    sugar_daddy: 'Sugar Daddy',
    sugar_mommy: 'Sugar Mommy',
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading profiles...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-12" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <h1 className="font-display text-3xl mb-8 text-center" style={{ color: 'var(--cream)' }}>
        Browse Members
      </h1>

      {error && <p className="text-center text-red-300 mb-6">{error}</p>}

      {profiles.length === 0 && !error && (
        <p className="text-center" style={{ color: 'var(--muted)' }}>
          No other members yet — check back soon!
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {profiles.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl overflow-hidden shadow-lg flex flex-col"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <div className="h-56 bg-black/30 flex items-center justify-center">
              {p.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.photoUrl} alt={p.display_name} className="w-full h-full object-cover" />
              ) : (
                <span style={{ color: 'var(--muted)' }}>No photo yet</span>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold" style={{ color: 'var(--cream)' }}>
                  {p.display_name}
                </h2>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--berry)', color: 'var(--cream)' }}>
                  {roleLabel[p.role] ?? p.role}
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                {[p.city, p.country].filter(Boolean).join(', ')}
              </p>
              <p className="text-sm mb-4 flex-1" style={{ color: 'var(--muted)' }}>
                {p.bio || 'No bio yet.'}
              </p>
              <button
                onClick={() => handleLike(p.id)}
                disabled={likedIds.has(p.id)}
                className="w-full py-2 rounded-full font-semibold text-sm disabled:opacity-50"
                style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
              >
                {likedIds.has(p.id) ? 'Liked' : 'Like'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

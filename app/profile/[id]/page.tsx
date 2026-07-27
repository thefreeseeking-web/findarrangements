'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import Nav from '../../components/Nav';

type FullProfile = {
  id: string;
  display_name: string;
  role: string;
  bio: string | null;
  looking_for: string | null;
  city: string | null;
  country: string | null;
};

const roleLabel: Record<string, string> = {
  sugar_baby: 'Sugar Baby',
  sugar_daddy: 'Sugar Daddy',
  sugar_mommy: 'Sugar Mommy',
};

export default function ProfileViewPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.id as string;
  const supabase = createClient();

  const [myId, setMyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push('/login');
        return;
      }
      setMyId(authData.user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, role, bio, looking_for, city, country')
        .eq('id', profileId)
        .maybeSingle();

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(profileData);

      const { data: photoRow } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('profile_id', profileId)
        .eq('is_primary', true)
        .eq('moderation_status', 'approved')
        .maybeSingle();

      if (photoRow) {
        const { data: signed } = await supabase.storage
          .from('photos')
          .createSignedUrl(photoRow.storage_path, 3600);
        setPhotoUrl(signed?.signedUrl ?? null);
      }

      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('liker_id', authData.user.id)
        .eq('liked_id', profileId)
        .maybeSingle();
      setLiked(!!existingLike);

      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .or(
          `and(profile_one_id.eq.${authData.user.id},profile_two_id.eq.${profileId}),and(profile_one_id.eq.${profileId},profile_two_id.eq.${authData.user.id})`
        )
        .maybeSingle();
      setMatchId(existingMatch?.id ?? null);

      setLoading(false);
    }

    load();
  }, [profileId]);

  async function handleLike() {
    if (!myId) return;
    setLiked(true);
    await supabase.from('likes').insert({ liker_id: myId, liked_id: profileId });

    // Check if that created a match just now
    const { data: newMatch } = await supabase
      .from('matches')
      .select('id')
      .or(
        `and(profile_one_id.eq.${myId},profile_two_id.eq.${profileId}),and(profile_one_id.eq.${profileId},profile_two_id.eq.${myId})`
      )
      .maybeSingle();
    if (newMatch) setMatchId(newMatch.id);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading profile...</p>
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p style={{ color: 'var(--muted)' }}>Profile not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <Nav />
      <div className="max-w-2xl mx-auto px-6 pb-12">
        <Link href="/browse" className="text-sm mb-6 inline-block" style={{ color: 'var(--muted)' }}>
          ← Back to Browse
        </Link>

        <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="h-80" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--muted)' }}>
                No photo yet
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h1 className="font-display text-3xl" style={{ color: 'var(--cream)' }}>
                {profile.display_name}
              </h1>
              <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--berry)', color: 'var(--cream)' }}>
                {roleLabel[profile.role] ?? profile.role}
              </span>
            </div>

            <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
              {[profile.city, profile.country].filter(Boolean).join(', ') || 'Location not set'}
            </p>

            <div className="mb-6">
              <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--gold)' }}>About</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--cream)' }}>
                {profile.bio || 'No bio yet.'}
              </p>
            </div>

            {profile.looking_for && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--gold)' }}>Looking for</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--cream)' }}>
                  {profile.looking_for}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleLike}
                disabled={liked}
                className="flex-1 py-3 rounded-full font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
              >
                {liked ? 'Liked' : 'Like'}
              </button>

              {matchId ? (
                <Link
                  href={`/messages/${matchId}`}
                  className="flex-1 py-3 rounded-full font-semibold text-center border"
                  style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
                >
                  Message
                </Link>
              ) : (
                <button
                  disabled
                  className="flex-1 py-3 rounded-full font-semibold border opacity-40"
                  style={{ borderColor: 'var(--muted)', color: 'var(--muted)' }}
                  title="You can message once you both like each other"
                >
                  Message (match first)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

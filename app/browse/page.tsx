'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

const REPORT_REASONS = [
  'Fake profile / not a real person',
  'Inappropriate photos',
  'Asking for money upfront',
  'Harassment or abuse',
  'Other',
];

export default function BrowsePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<Profile | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push('/login');
        return;
      }
      setUserId(authData.user.id);

      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', authData.user.id);

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

      const { data: myLikes } = await supabase
        .from('likes')
        .select('liked_id')
        .eq('liker_id', authData.user.id);

      setLikedIds(new Set((myLikes ?? []).map((l) => l.liked_id)));

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

  async function handleLike(likedId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!userId) return;

    setLikedIds((prev) => new Set(prev).add(likedId));

    const { error: likeError } = await supabase.from('likes').insert({
      liker_id: userId,
      liked_id: likedId,
    });

    if (likeError) {
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(likedId);
        return next;
      });
    }
  }

  async function submitReport() {
    if (!userId || !reportTarget) return;

    await supabase.from('reports').insert({
      reporter_id: userId,
      reported_id: reportTarget.id,
      reason: reportReason,
      details: reportDetails,
    });

    setReportSubmitted(true);
  }

  function closeReportModal() {
    setReportTarget(null);
    setReportReason(REPORT_REASONS[0]);
    setReportDetails('');
    setReportSubmitted(false);
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
      <nav className="flex items-center justify-between max-w-5xl mx-auto mb-10 flex-wrap gap-3">
        <span className="font-display text-xl" style={{ color: 'var(--cream)' }}>FindArrangements</span>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/browse" style={{ color: 'var(--gold)' }}>Browse</Link>
          <Link href="/messages" style={{ color: 'var(--muted)' }}>Messages</Link>
          <Link href="/profile/edit" style={{ color: 'var(--muted)' }}>Edit Profile</Link>
        </div>
      </nav>

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
          <Link
            href={`/profile/${p.id}`}
            key={p.id}
            className="rounded-2xl overflow-hidden shadow-lg flex flex-col"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <div className="h-56 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
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
              <div className="flex gap-2">
                <button
                  onClick={(e) => handleLike(p.id, e)}
                  disabled={likedIds.has(p.id)}
                  className="flex-1 py-2 rounded-full font-semibold text-sm disabled:opacity-50"
                  style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
                >
                  {likedIds.has(p.id) ? 'Liked' : 'Like'}
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setReportTarget(p);
                  }}
                  className="px-3 py-2 rounded-full text-xs font-semibold border"
                  style={{ borderColor: 'var(--muted)', color: 'var(--muted)' }}
                >
                  Report
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="max-w-sm w-full rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
            {reportSubmitted ? (
              <>
                <h3 className="font-display text-lg mb-3" style={{ color: 'var(--cream)' }}>
                  Report submitted
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
                  Thanks for helping keep the community safe. Our team will review this.
                </p>
                <button
                  onClick={closeReportModal}
                  className="w-full py-2.5 rounded-full font-semibold"
                  style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg mb-4" style={{ color: 'var(--cream)' }}>
                  Report {reportTarget.display_name}
                </h3>
                <label className="block mb-3">
                  <span className="text-sm" style={{ color: 'var(--cream)' }}>Reason</span>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10"
                    style={{ color: 'var(--cream)', colorScheme: 'dark' }}
                  >
                    {REPORT_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="block mb-5">
                  <span className="text-sm" style={{ color: 'var(--cream)' }}>Details (optional)</span>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10"
                    style={{ color: 'var(--cream)' }}
                  />
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={submitReport}
                    className="flex-1 py-2.5 rounded-full font-semibold"
                    style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
                  >
                    Submit Report
                  </button>
                  <button
                    onClick={closeReportModal}
                    className="px-4 py-2.5 rounded-full font-semibold border"
                    style={{ borderColor: 'var(--muted)', color: 'var(--cream)' }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

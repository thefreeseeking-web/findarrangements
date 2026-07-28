'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import Nav from '../components/Nav';

type Profile = {
  id: string;
  display_name: string;
  role: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  photoUrl: string | null;
  last_seen: string | null;
  created_at: string;
};

const REPORT_REASONS = [
  'Fake profile / not a real person',
  'Inappropriate photos',
  'Asking for money upfront',
  'Harassment or abuse',
  'Other',
];

const ONLINE_MINUTES = 5;
const RECENT_MINUTES = 60;
const NEW_MEMBER_DAYS = 30;
const PAGE_SIZE = 12;

function getStatus(lastSeen: string | null): 'online' | 'recent' | 'offline' {
  if (!lastSeen) return 'offline';
  const diffMin = (Date.now() - new Date(lastSeen).getTime()) / 60000;
  if (diffMin < ONLINE_MINUTES) return 'online';
  if (diffMin < RECENT_MINUTES) return 'recent';
  return 'offline';
}

function isNewMember(createdAt: string) {
  const days = (Date.now() - new Date(createdAt).getTime()) / 86400000;
  return days <= NEW_MEMBER_DAYS;
}

export default function BrowsePage() {
  const router = useRouter();
  const supabase = createClient();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [matchedIds, setMatchedIds] = useState<Map<string, string>>(new Map()); // profileId -> matchId
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<Profile | null>(null);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'recent' | 'new'>('all');
  const [page, setPage] = useState(1);

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
        .select('id, display_name, role, bio, city, country, last_seen, created_at')
        .neq('id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(200);

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

      const { data: myMatches } = await supabase
        .from('matches')
        .select('id, profile_one_id, profile_two_id')
        .or(`profile_one_id.eq.${authData.user.id},profile_two_id.eq.${authData.user.id}`);

      const matchMap = new Map<string, string>();
      (myMatches ?? []).forEach((m) => {
        const otherId = m.profile_one_id === authData.user.id ? m.profile_two_id : m.profile_one_id;
        matchMap.set(otherId, m.id);
      });
      setMatchedIds(matchMap);

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

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const matchesSearch =
        !searchText ||
        p.display_name.toLowerCase().includes(searchText.toLowerCase()) ||
        (p.city ?? '').toLowerCase().includes(searchText.toLowerCase()) ||
        (p.bio ?? '').toLowerCase().includes(searchText.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'new') return isNewMember(p.created_at);
      const status = getStatus(p.last_seen);
      if (statusFilter === 'online') return status === 'online';
      if (statusFilter === 'recent') return status === 'online' || status === 'recent';
      return true;
    });
  }, [profiles, searchText, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProfiles.length / PAGE_SIZE));
  const pagedProfiles = filteredProfiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchText, statusFilter]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading profiles...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 pb-12" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <Nav />

      <h1 className="font-display text-2xl sm:text-3xl mb-6 text-center" style={{ color: 'var(--cream)' }}>
        Browse Members
      </h1>

      <div className="max-w-5xl mx-auto mb-8 flex flex-wrap gap-2 sm:gap-3 items-center justify-center">
        <input
          type="text"
          placeholder="Search by name, city, or bio..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="rounded-full px-4 py-2 bg-white/5 border border-white/10 text-sm w-full sm:w-64"
          style={{ color: 'var(--cream)' }}
        />
        {(['all', 'online', 'recent', 'new'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className="px-3 sm:px-4 py-2 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: statusFilter === f ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
              color: statusFilter === f ? '#1a1014' : 'var(--muted)',
            }}
          >
            {f === 'all' ? 'All' : f === 'online' ? 'Online now' : f === 'recent' ? 'Recently active' : 'New members'}
          </button>
        ))}
      </div>

      {error && <p className="text-center text-red-300 mb-6">{error}</p>}

      {filteredProfiles.length === 0 && !error && (
        <p className="text-center" style={{ color: 'var(--muted)' }}>
          No members match this search yet.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
        {pagedProfiles.map((p) => {
          const status = getStatus(p.last_seen);
          const matchId = matchedIds.get(p.id);
          return (
            <div
              key={p.id}
              className="rounded-2xl overflow-hidden shadow-lg flex flex-col transition-transform hover:-translate-y-1 hover:shadow-2xl"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Link href={`/profile/${p.id}`} className="h-48 sm:h-56 relative flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoUrl} alt={p.display_name} className="w-full h-full object-cover" />
                ) : (
                  <span style={{ color: 'var(--muted)' }}>No photo yet</span>
                )}
                <span
                  className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-full font-semibold uppercase"
                  style={{
                    backgroundColor:
                      status === 'online' ? '#2e7d4f' : status === 'recent' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)',
                    color: status === 'online' ? '#fff' : 'var(--muted)',
                  }}
                >
                  {status === 'online' ? '● Online' : status === 'recent' ? 'Recently active' : 'Offline'}
                </span>
                {isNewMember(p.created_at) && (
                  <span
                    className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-full font-semibold uppercase"
                    style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
                  >
                    New
                  </span>
                )}
              </Link>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <Link href={`/profile/${p.id}`} className="font-semibold" style={{ color: 'var(--cream)' }}>
                    {p.display_name}
                  </Link>
                  <span
                    className="text-xs px-2 py-1 rounded-full uppercase tracking-wide"
                    style={{ backgroundColor: 'var(--berry)', color: 'var(--cream)', fontSize: '0.65rem' }}
                  >
                    {roleLabel[p.role] ?? p.role}
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                  {[p.city, p.country].filter(Boolean).join(', ')}
                </p>
                <p
                  className="text-sm mb-4 flex-1 overflow-hidden"
                  style={{ color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
                >
                  {p.bio || 'No bio yet.'}
                </p>
                <div className="flex gap-2">
                  {matchId ? (
                    <Link
                      href={`/messages/${matchId}`}
                      className="flex-1 py-2 rounded-full font-semibold text-sm text-center border"
                      style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
                    >
                      Message
                    </Link>
                  ) : (
                    <button
                      onClick={(e) => handleLike(p.id, e)}
                      disabled={likedIds.has(p.id)}
                      className="flex-1 py-2 rounded-full font-semibold text-sm disabled:opacity-50"
                      style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
                    >
                      {likedIds.has(p.id) ? 'Liked' : 'Like'}
                    </button>
                  )}
                  <button
                    onClick={() => setReportTarget(p)}
                    className="px-3 py-2 rounded-full text-xs font-semibold border"
                    style={{ borderColor: 'var(--muted)', color: 'var(--muted)' }}
                  >
                    Report
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-30"
            style={{ border: '1px solid var(--muted)', color: 'var(--cream)' }}
          >
            ← Prev
          </button>
          <span className="text-sm" style={{ color: 'var(--muted)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-30"
            style={{ border: '1px solid var(--muted)', color: 'var(--cream)' }}
          >
            Next →
          </button>
        </div>
      )}

      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="max-w-sm w-full rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
            {reportSubmitted ? (
              <>
                <h3 className="font-display text-lg mb-3" style={{ color: 'var(--cream)' }}>Report submitted</h3>
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
                    {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
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

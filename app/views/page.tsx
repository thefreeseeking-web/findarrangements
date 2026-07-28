'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import Nav from '../components/Nav';

type Viewer = {
  id: string;
  viewId: string;
  display_name: string;
  role: string;
  photoUrl: string | null;
  viewedAt: string;
};

const roleLabel: Record<string, string> = {
  sugar_baby: 'Sugar Baby',
  sugar_daddy: 'Sugar Daddy',
  sugar_mommy: 'Sugar Mommy',
};

export default function ViewsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push('/login');
        return;
      }

      const { data: viewRows } = await supabase
        .from('profile_views')
        .select('id, viewer_id, created_at')
        .eq('viewed_id', authData.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const results = await Promise.all(
        (viewRows ?? []).map(async (v) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, role')
            .eq('id', v.viewer_id)
            .maybeSingle();

          const { data: photoRow } = await supabase
            .from('photos')
            .select('storage_path')
            .eq('profile_id', v.viewer_id)
            .eq('is_primary', true)
            .eq('moderation_status', 'approved')
            .maybeSingle();

          let photoUrl: string | null = null;
          if (photoRow) {
            const { data: signed } = await supabase.storage.from('photos').createSignedUrl(photoRow.storage_path, 3600);
            photoUrl = signed?.signedUrl ?? null;
          }

          return {
            id: v.viewer_id,
            viewId: v.id,
            display_name: profile?.display_name ?? 'Member',
            role: profile?.role ?? '',
            photoUrl,
            viewedAt: v.created_at,
          };
        })
      );

      setViewers(results);
      setLoading(false);

      await supabase.from('profile_views').update({ seen: true }).eq('viewed_id', authData.user.id).eq('seen', false);
    }

    load();
  }, []);

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
        Who Viewed Your Profile
      </h1>

      {viewers.length === 0 ? (
        <p className="text-center" style={{ color: 'var(--muted)' }}>No profile views yet.</p>
      ) : (
        <div className="max-w-lg mx-auto space-y-3">
          {viewers.map((v) => (
            <Link
              key={v.viewId}
              href={`/profile/${v.id}`}
              className="flex items-center gap-4 p-4 rounded-xl"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                {v.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.photoUrl} alt={v.display_name} className="w-full h-full object-cover object-top" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold" style={{ color: 'var(--cream)' }}>{v.display_name}</p>
                  <span className="text-xs" style={{ color: 'var(--gold)' }}>{roleLabel[v.role] ?? v.role}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  Viewed {new Date(v.viewedAt).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

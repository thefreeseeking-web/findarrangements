'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  reported_id: string;
  reporter_id: string;
  reportedName?: string;
  reporterName?: string;
};

type MemberRow = {
  id: string;
  display_name: string;
  role: string;
  is_banned: boolean;
  last_seen: string | null;
  created_at: string;
};

const ONLINE_WINDOW_MINUTES = 5;

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [members, setMembers] = useState<MemberRow[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const isOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    const diffMs = Date.now() - new Date(lastSeen).getTime();
    return diffMs < ONLINE_WINDOW_MINUTES * 60 * 1000;
  };

  const loadData = useCallback(async () => {
    setLoadingData(true);

    const { data: membersData } = await supabase
      .from('profiles')
      .select('id, display_name, role, is_banned, last_seen, created_at')
      .order('created_at', { ascending: false });

    setMembers(membersData ?? []);

    const { data: reportsData } = await supabase
      .from('reports')
      .select('id, reason, details, status, created_at, reported_id, reporter_id')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    const withNames = await Promise.all(
      (reportsData ?? []).map(async (r) => {
        const { data: reportedProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', r.reported_id)
          .maybeSingle();
        const { data: reporterProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', r.reporter_id)
          .maybeSingle();

        return {
          ...r,
          reportedName: reportedProfile?.display_name ?? 'Unknown',
          reporterName: reporterProfile?.display_name ?? 'Unknown',
        };
      })
    );

    setReports(withNames);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    async function checkAccess() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push('/login');
        return;
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!myProfile?.is_admin) {
        router.push('/browse');
        return;
      }

      setIsAdmin(true);
      setCheckingAccess(false);
      loadData();
    }

    checkAccess();
  }, []);

  async function handleBan(memberId: string) {
    await supabase.from('profiles').update({ is_banned: true }).eq('id', memberId);
    loadData();
  }

  async function handleUnban(memberId: string) {
    await supabase.from('profiles').update({ is_banned: false }).eq('id', memberId);
    loadData();
  }

  async function handleDismissReport(reportId: string) {
    await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId);
    loadData();
  }

  async function handleBanFromReport(reportId: string, reportedId: string) {
    await supabase.from('profiles').update({ is_banned: true }).eq('id', reportedId);
    await supabase.from('reports').update({ status: 'reviewed' }).eq('id', reportId);
    loadData();
  }

  if (checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p style={{ color: 'var(--muted)' }}>Checking access...</p>
      </main>
    );
  }

  if (!isAdmin) return null;

  const totalMembers = members.length;
  const onlineNow = members.filter((m) => isOnline(m.last_seen)).length;
  const roleCounts = members.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1;
    return acc;
  }, {});
  const bannedCount = members.filter((m) => m.is_banned).length;

  const roleLabel: Record<string, string> = {
    sugar_baby: 'Sugar Babies',
    sugar_daddy: 'Sugar Daddies',
    sugar_mommy: 'Sugar Mommies',
  };

  return (
    <main className="min-h-screen px-6 py-12" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <h1 className="font-display text-3xl mb-8" style={{ color: 'var(--cream)' }}>
        Admin Dashboard
      </h1>

      {loadingData ? (
        <p style={{ color: 'var(--muted)' }}>Loading...</p>
      ) : (
        <>
          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard label="Total Members" value={totalMembers} />
            <StatCard label="Online Now" value={onlineNow} highlight />
            <StatCard label="Banned" value={bannedCount} />
            {Object.entries(roleCounts).map(([role, count]) => (
              <StatCard key={role} label={roleLabel[role] ?? role} value={count} />
            ))}
          </div>

          {/* REPORTS */}
          <section className="mb-12">
            <h2 className="font-display text-xl mb-4" style={{ color: 'var(--cream)' }}>
              Open Reports ({reports.length})
            </h2>
            {reports.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No open reports. All clear.</p>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface)' }}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="text-sm" style={{ color: 'var(--cream)' }}>
                        <strong>{r.reportedName}</strong> reported by {r.reporterName}
                      </p>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mb-1" style={{ color: 'var(--gold)' }}>{r.reason}</p>
                    {r.details && (
                      <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>{r.details}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBanFromReport(r.id, r.reported_id)}
                        className="px-4 py-1.5 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: '#c0392b', color: '#fff' }}
                      >
                        Ban Profile
                      </button>
                      <button
                        onClick={() => handleDismissReport(r.id)}
                        className="px-4 py-1.5 rounded-full text-xs font-semibold border"
                        style={{ borderColor: 'var(--muted)', color: 'var(--muted)' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ALL MEMBERS */}
          <section>
            <h2 className="font-display text-xl mb-4" style={{ color: 'var(--cream)' }}>
              All Members
            </h2>
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: 'var(--muted)' }}>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-t border-white/5">
                      <td className="px-4 py-3" style={{ color: 'var(--cream)' }}>
                        {m.display_name}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>
                        {roleLabel[m.role] ?? m.role}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: isOnline(m.last_seen) ? '#2e7d4f' : 'rgba(255,255,255,0.08)',
                            color: isOnline(m.last_seen) ? '#fff' : 'var(--muted)',
                          }}
                        >
                          {m.is_banned ? 'Banned' : isOnline(m.last_seen) ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {m.is_banned ? (
                          <button
                            onClick={() => handleUnban(m.id)}
                            className="text-xs font-semibold"
                            style={{ color: 'var(--gold)' }}
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBan(m.id)}
                            className="text-xs font-semibold"
                            style={{ color: '#e57373' }}
                          >
                            Ban
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{ backgroundColor: highlight ? 'var(--berry)' : 'var(--surface)' }}
    >
      <p className="font-display text-3xl mb-1" style={{ color: 'var(--gold)' }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--cream)' }}>
        {label}
      </p>
    </div>
  );
}

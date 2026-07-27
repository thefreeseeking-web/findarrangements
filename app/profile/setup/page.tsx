'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function ProfileSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/login');
        return;
      }
      setUserId(data.user.id);
    }
    loadUser();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!userId) return;
    setLoading(true);

    // 1. Save bio/location to the profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ bio, city, region, country })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // 2. Upload photo, if one was chosen
    if (photoFile) {
      const filePath = `${userId}/${Date.now()}-${photoFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, photoFile);

      if (uploadError) {
        setError(uploadError.message);
        setLoading(false);
        return;
      }

      const { error: photoRowError } = await supabase.from('photos').insert({
        profile_id: userId,
        storage_path: filePath,
        is_primary: true,
        moderation_status: 'pending', // reviewed before it shows publicly
      });

      if (photoRowError) {
        setError(photoRowError.message);
        setLoading(false);
        return;
      }
    }

    router.push('/browse');
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <h1 className="font-display text-2xl mb-2" style={{ color: 'var(--cream)' }}>
          Complete your profile
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          This is what other members will see. You can update it anytime.
        </p>

        {error && (
          <p className="mb-4 text-sm p-3 rounded bg-red-900/40 text-red-200">{error}</p>
        )}

        <label className="block mb-4">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>About you</span>
          <textarea
            required
            rows={4}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people what you're looking for..."
            className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10"
            style={{ color: 'var(--cream)' }}
          />
        </label>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>City</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10"
              style={{ color: 'var(--cream)' }}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Region/State</span>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10"
              style={{ color: 'var(--cream)' }}
            />
          </label>
        </div>

        <label className="block mb-4">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Country</span>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10"
            style={{ color: 'var(--cream)' }}
          />
        </label>

        <label className="block mb-6">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Profile photo</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
            style={{ color: 'var(--muted)' }}
          />
          <span className="text-xs block mt-1" style={{ color: 'var(--muted)' }}>
            Your photo is reviewed before it appears publicly.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full font-semibold disabled:opacity-50"
          style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
        >
          {loading ? 'Saving...' : 'Save & Continue'}
        </button>
      </form>
    </main>
  );
}

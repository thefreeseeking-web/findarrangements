'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import Nav from '../../components/Nav';
import { COUNTRIES, STATES_BY_COUNTRY } from '@/lib/locationData';

export default function ProfileEditPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        router.push('/login');
        return;
      }
      setUserId(authData.user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('bio, looking_for, city, region, country')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (profileData) {
        setBio(profileData.bio ?? '');
        setLookingFor(profileData.looking_for ?? '');
        setCity(profileData.city ?? '');
        setRegion(profileData.region ?? '');
        setCountry(profileData.country ?? '');
      }

      const { data: photoRow } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('profile_id', authData.user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (photoRow) {
        const { data: signed } = await supabase.storage
          .from('photos')
          .createSignedUrl(photoRow.storage_path, 3600);
        setCurrentPhotoUrl(signed?.signedUrl ?? null);
      }

      setLoading(false);
    }

    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setError(null);
    setSaving(true);
    setSaved(false);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ bio, looking_for: lookingFor, city, region, country })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    if (photoFile) {
      const filePath = `${userId}/${Date.now()}-${photoFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, photoFile);

      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }

      // Unset the old primary photo, then insert the new one as primary
      const { error: unsetError } = await supabase
        .from('photos')
        .update({ is_primary: false })
        .eq('profile_id', userId)
        .eq('is_primary', true);

      if (unsetError) {
        setError(`Couldn't update old photo: ${unsetError.message}`);
        setSaving(false);
        return;
      }

      const { error: insertError } = await supabase.from('photos').insert({
        profile_id: userId,
        storage_path: filePath,
        is_primary: true,
        moderation_status: 'approved',
      });

      if (insertError) {
        setError(`Couldn't save photo record: ${insertError.message}`);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p style={{ color: 'var(--muted)' }}>Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <Nav />
      <div className="flex items-center justify-center px-6 pb-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h1 className="font-display text-2xl" style={{ color: 'var(--cream)' }}>
            Edit your profile
          </h1>
          {userId && (
            <Link
              href={`/profile/${userId}`}
              className="text-xs font-semibold"
              style={{ color: 'var(--gold)' }}
            >
              Preview my profile →
            </Link>
          )}
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          Update anything you skipped or want to change.
        </p>

        {error && <p className="mb-4 text-sm p-3 rounded bg-red-900/40 text-red-200">{error}</p>}
        {saved && <p className="mb-4 text-sm p-3 rounded bg-green-900/40 text-green-200">Saved!</p>}

        {currentPhotoUrl && (
          <div className="mb-4 w-24 h-24 rounded-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentPhotoUrl} alt="Current profile" className="w-full h-full object-cover" />
          </div>
        )}

        <label className="block mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>About you</span>
          <textarea
            rows={4}
            maxLength={500}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10"
            style={{ color: 'var(--cream)' }}
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>What you're looking for</span>
          <textarea
            rows={3}
            maxLength={300}
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="e.g. Someone genuine for a mutually beneficial arrangement..."
            className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10"
            style={{ color: 'var(--cream)' }}
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Country</span>
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setRegion('');
            }}
            className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10"
            style={{ color: 'var(--cream)', colorScheme: 'dark' }}
          >
            <option value="">Select country...</option>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>State/Province</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={!country}
              className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 disabled:opacity-40"
              style={{ color: 'var(--cream)', colorScheme: 'dark' }}
            >
              <option value="">Select...</option>
              {(STATES_BY_COUNTRY[country] ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>City</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="If not listed, type it here"
              className="mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10"
              style={{ color: 'var(--cream)' }}
            />
          </label>
        </div>

        <label className="block mb-6">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>
            {currentPhotoUrl ? 'Replace photo' : 'Add a photo'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm"
            style={{ color: 'var(--muted)' }}
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-full font-semibold disabled:opacity-50"
          style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
      </div>
    </main>
  );
}

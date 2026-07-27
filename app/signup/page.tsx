'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('sugar_baby');
  const [birthdate, setBirthdate] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function isAdult(dob: string) {
    if (!dob) return false;
    const birth = new Date(dob);
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    return birth <= eighteenYearsAgo;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isAdult(birthdate)) {
      setError('You must be 18 or older to join FindArrangements.');
      return;
    }
    if (!agreed) {
      setError('You must agree to the Terms of Service to continue.');
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      display_name: displayName,
      role,
      birthdate,
      is_verified_adult: true,
    });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    router.push('/profile/setup');
  }

  const inputClass =
    'mt-1 w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 focus:outline-none focus:border-[var(--gold)]';

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16" style={{ backgroundColor: 'var(--bg-deep)' }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl p-8 shadow-2xl"
        style={{ backgroundColor: 'var(--surface)' }}
      >
        <h1 className="font-display text-2xl mb-6" style={{ color: 'var(--cream)' }}>
          Create your free account
        </h1>

        {error && (
          <p className="mb-4 text-sm p-3 rounded bg-red-900/40 text-red-200">{error}</p>
        )}

        <label className="block mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Display name</span>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
            style={{ color: 'var(--cream)' }}
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            style={{ color: 'var(--cream)' }}
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Password</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            style={{ color: 'var(--cream)' }}
          />
        </label>

        <label className="block mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Date of birth</span>
          <input
            type="date"
            required
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className={inputClass}
            style={{ color: 'var(--cream)', colorScheme: 'dark' }}
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>I am a...</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
            style={{ color: 'var(--cream)', colorScheme: 'dark' }}
          >
            <option value="sugar_baby">Sugar Baby</option>
            <option value="sugar_daddy">Sugar Daddy</option>
            <option value="sugar_mommy">Sugar Mommy</option>
          </select>
        </label>

        <label className="flex items-start gap-2 mb-6 text-sm">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
          />
          <span style={{ color: 'var(--muted)' }}>
            I am 18 or older and agree to the Terms of Service, which
            prohibit solicitation of commercial sexual services.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full font-semibold disabled:opacity-50"
          style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
        >
          {loading ? 'Creating account...' : 'Create Free Account'}
        </button>
      </form>
    </main>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/browse');
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
          Log in
        </h1>

        {error && (
          <p className="mb-4 text-sm p-3 rounded bg-red-900/40 text-red-200">{error}</p>
        )}

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

        <label className="block mb-6">
          <span className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            style={{ color: 'var(--cream)' }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full font-semibold disabled:opacity-50"
          style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </main>
  );
}

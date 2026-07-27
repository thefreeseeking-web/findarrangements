import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center py-12">
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden mb-8 relative h-64 md:h-80">
        <Image
          src="/images/hero.jpeg"
          alt="Meet generous partners on FindArrangements"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />
      </div>

      <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--brand-primary)' }}>
        FindArrangements
      </h1>
      <p className="text-base font-semibold mb-4 max-w-xl" style={{ color: 'var(--brand-primary)' }}>
        The Free Sugar Daddy &amp; Sugar Baby Dating Site
      </p>
      <p className="text-lg mb-2 max-w-xl">
        Sugar Daddies, Sugar Mommies, and Sugar Babies connect here for
        mutually beneficial arrangements — real people, real connections.
      </p>
      <p className="text-sm font-semibold uppercase tracking-wide mb-8" style={{ color: 'var(--brand-accent)' }}>
        100% Free — No Credits. No Subscriptions. No Paywalls.
      </p>

      <div className="flex gap-4">
        <Link
          href="/signup"
          className="px-6 py-3 rounded-full text-white font-semibold"
          style={{ backgroundColor: 'var(--brand-primary)' }}
        >
          Create Free Account
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 rounded-full font-semibold border"
          style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
        >
          Log In
        </Link>
      </div>

      <p className="mt-10 text-xs text-gray-500 max-w-md">
        Must be 18 or older to join. By signing up you agree to our Terms of
        Service, which prohibit solicitation of commercial sexual services.
      </p>
    </main>
  );
}

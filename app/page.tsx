import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  return (
    <main>
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-12 py-5 backdrop-blur-md bg-[#1a1014]/70">
        <span className="font-display text-xl tracking-wide" style={{ color: 'var(--cream)' }}>
          FindArrangements
        </span>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm hidden sm:inline" style={{ color: 'var(--muted)' }}>
            Log In
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold px-5 py-2 rounded-full"
            style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
          >
            Join Free
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative h-[92vh] min-h-[560px] w-full flex items-end">
        <Image
          src="/images/hero.jpeg"
          alt="Sugar dating on FindArrangements"
          fill
          priority
          style={{ objectFit: 'cover' }}
          className="brightness-[0.55]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(26,16,20,0.1) 0%, rgba(26,16,20,0.55) 55%, rgba(26,16,20,0.95) 100%)',
          }}
        />
        <div className="relative z-10 px-6 md:px-12 pb-16 max-w-3xl">
          <p
            className="text-xs uppercase tracking-[0.25em] mb-4 font-semibold"
            style={{ color: 'var(--gold)' }}
          >
            The Free Sugar Daddy &amp; Sugar Baby Dating Site
          </p>
          <h1 className="font-display text-4xl md:text-6xl leading-tight mb-6" style={{ color: 'var(--cream)' }}>
            Arrangements built on{' '}
            <span className="gold-underline italic" style={{ color: 'var(--gold)' }}>
              honesty
            </span>
            , not paywalls.
          </h1>
          <p className="text-base md:text-lg mb-8 max-w-xl" style={{ color: 'var(--muted)' }}>
            Sugar Daddies, Sugar Mommies, and Sugar Babies connect here for
            mutually beneficial relationships — no credits, no subscriptions,
            no hidden fees, ever.
          </p>
          <div className="flex gap-4">
            <Link
              href="/signup"
              className="px-7 py-3.5 rounded-full font-semibold"
              style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="px-7 py-3.5 rounded-full font-semibold border"
              style={{ borderColor: 'var(--muted)', color: 'var(--cream)' }}
            >
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section
        className="w-full py-6 px-6 md:px-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-medium"
        style={{ backgroundColor: 'var(--surface)', color: 'var(--gold)' }}
      >
        <span>No Credits</span>
        <span className="opacity-30">•</span>
        <span>No Subscriptions</span>
        <span className="opacity-30">•</span>
        <span>No Paywalls</span>
        <span className="opacity-30">•</span>
        <span>100% Free, Always</span>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
        <h2 className="font-display text-3xl md:text-4xl mb-12 text-center" style={{ color: 'var(--cream)' }}>
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-10">
          {[
            {
              step: '01',
              title: 'Create your profile',
              body: 'Tell your story, add your photos, and set what you\u2019re looking for \u2014 Sugar Daddy, Sugar Mommy, or Sugar Baby.',
            },
            {
              step: '02',
              title: 'Browse & connect',
              body: 'Like the profiles that catch your eye. When it\u2019s mutual, a private chat opens instantly.',
            },
            {
              step: '03',
              title: 'Meet on your terms',
              body: 'Talk freely, exchange contact details whenever you\u2019re ready \u2014 no paywall stands between you and a real connection.',
            },
          ].map((item) => (
            <div key={item.step}>
              <p className="font-display text-lg mb-3" style={{ color: 'var(--gold)' }}>
                {item.step}
              </p>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--cream)' }}>
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section
        className="px-6 md:px-12 py-16 text-center"
        style={{ backgroundColor: 'var(--berry)' }}
      >
        <h2 className="font-display text-3xl mb-4" style={{ color: 'var(--cream)' }}>
          Your arrangement is waiting.
        </h2>
        <Link
          href="/signup"
          className="inline-block px-8 py-3.5 rounded-full font-semibold mt-2"
          style={{ backgroundColor: 'var(--gold)', color: '#1a1014' }}
        >
          Create Free Account
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-12 py-10 text-center" style={{ backgroundColor: 'var(--bg-deep)' }}>
        <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
          Must be 18 or older to join. By signing up you agree to our Terms
          of Service, which prohibit solicitation of commercial sexual
          services.
        </p>
      </footer>
    </main>
  );
}

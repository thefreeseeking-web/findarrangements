import './globals.css';
import AgeGate from './components/AgeGate';

const siteUrl = 'https://findarrangements.com';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FindArrangements — 100% Free Sugar Daddy & Sugar Baby Dating Site',
    template: '%s | FindArrangements',
  },
  description:
    'FindArrangements is the only completely free sugar dating site for Sugar Daddies, Sugar Mommies, and Sugar Babies in the US, Canada, and Australia. No credits, no subscriptions, no paywalls — ever.',
  keywords: [
    'free sugar daddy site',
    'free sugar baby site',
    'free sugar mommy site',
    'sugar dating',
    'sugar daddy dating',
    'free dating site',
    'arrangement dating',
    'sugar daddy website free',
    'sugar baby website free',
  ],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'FindArrangements — 100% Free Sugar Daddy & Sugar Baby Dating Site',
    description:
      'The only completely free sugar dating site. No credits, no subscriptions, no paywalls. Join Sugar Daddies, Sugar Mommies, and Sugar Babies today.',
    url: siteUrl,
    siteName: 'FindArrangements',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'FindArrangements — 100% Free Sugar Daddy & Sugar Baby Dating Site',
    description: 'The only completely free sugar dating site. No credits, no subscriptions, no paywalls.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'FindArrangements',
              url: siteUrl,
              description:
                'FindArrangements is a completely free sugar dating platform connecting Sugar Daddies, Sugar Mommies, and Sugar Babies in the US, Canada, and Australia. No credits, subscriptions, or paywalls.',
              potentialAction: {
                '@type': 'SearchAction',
                target: `${siteUrl}/browse?q={search_term_string}`,
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <AgeGate />
        {children}
      </body>
    </html>
  );
}

import './globals.css';
import AgeGate from './components/AgeGate';

export const metadata = {
  title: 'FindArrangements — 100% Free Arrangement Dating',
  description:
    'Meet generous partners and ambitious companions. Completely free — no credits, no subscriptions, no paywalls.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AgeGate />
        {children}
      </body>
    </html>
  );
}

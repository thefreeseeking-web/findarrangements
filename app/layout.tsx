import './globals.css';
import AgeGate from './components/AgeGate';

export const metadata = {
  title: 'FindArrangements — Free Sugar Daddy & Sugar Baby Dating Site',
  description:
    'The free sugar dating site for Sugar Daddies, Sugar Mommies, and Sugar Babies. No credits, no subscriptions, no paywalls — 100% free.',
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

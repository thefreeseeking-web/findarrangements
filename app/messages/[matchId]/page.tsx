'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

// This route now just forwards into the main two-pane Messages experience
// with this conversation pre-selected, so every existing "Message" link
// across the site keeps working without changes.
export default function ChatRedirect() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  useEffect(() => {
    router.replace(`/messages?open=${matchId}`);
  }, [matchId]);

  return null;
}

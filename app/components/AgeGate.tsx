'use client';

import { useState, useEffect } from 'react';

export default function AgeGate() {
  const [verified, setVerified] = useState(true); // default true to avoid flash before check runs
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const alreadyVerified = sessionStorage.getItem('age_verified');
    setVerified(alreadyVerified === 'true');
    setChecked(true);
  }, []);

  function handleConfirm() {
    sessionStorage.setItem('age_verified', 'true');
    setVerified(true);
  }

  function handleDeny() {
    window.location.href = 'https://www.google.com';
  }

  if (!checked || verified) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-2xl">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--brand-primary)' }}>
          Age Verification Required
        </h2>
        <p className="text-sm text-gray-700 mb-6">
          FindArrangements.com is an adult dating platform intended for
          users 18 years of age or older. By entering, you confirm that you
          are at least 18 years old.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleConfirm}
            className="px-6 py-3 rounded-full text-white font-semibold"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            I am 18 or older
          </button>
          <button
            onClick={handleDeny}
            className="px-6 py-3 rounded-full font-semibold border border-gray-300 text-gray-700"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

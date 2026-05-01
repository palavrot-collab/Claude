'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function SignInPage({ params }: { params: { locale: string } }) {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'request' | 'verify'>('request');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale: params.locale }),
      });
      setStage('verify');
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn('email-otp', { email, code, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    router.push(`/${params.locale}`);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-semibold">{t('signInTitle')}</h1>
      {stage === 'request' ? (
        <form onSubmit={requestCode} className="space-y-4">
          <label className="block">
            <span className="text-sm">{t('emailLabel')}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            disabled={busy}
            className="rounded bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? tCommon('loading') : t('sendCode')}
          </button>
          <p className="text-xs text-slate-500">{t('ssoHint')}</p>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <label className="block">
            <span className="text-sm">{t('codeLabel')}</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 tracking-widest"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            disabled={busy}
            className="rounded bg-brand-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? tCommon('loading') : t('verify')}
          </button>
        </form>
      )}
    </main>
  );
}

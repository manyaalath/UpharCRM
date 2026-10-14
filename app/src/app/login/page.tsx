'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CircleAlert, Clock } from 'lucide-react';
import { Button, Field, Input, cn } from '@/components/ui';

type Mode = 'signin' | 'request';
type Product = 'challans' | 'books';

const DESKS = [
  { name: 'CRM', who: 'Admins, managers, telecallers', what: 'Leads, follow-up calls, district and rep analytics' },
  { name: 'Challan entry', who: 'Back-office operators', what: 'Key in paper challans, bulk Excel import' },
  { name: 'Book catalogue', who: 'Catalogue team', what: 'Add and maintain specimen titles' },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [product, setProduct] = useState<Product>('challans');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get('reason') === 'revoked' ? 'Your access was changed by an admin. Please sign in again.' : null
  );
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(mode === 'signin' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'signin' ? { email, password } : { name, email, password, product }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.status === 'pending') {
        setPending(true);
        return;
      }
      if (res.ok && data.redirect) {
        const next = params.get('next');
        router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : data.redirect);
        router.refresh();
        return;
      }
      setError(data.error || 'Something went wrong. Try again.');
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (pending) {
    return (
      <div>
        <div className="flex items-center gap-2 text-warn mb-3">
          <Clock className="size-5" />
          <span className="text-[13px] font-semibold">Waiting for approval</span>
        </div>
        <h2 className="font-serif text-[24px] font-semibold text-ink leading-tight">Your request is with the admin</h2>
        <p className="mt-2 text-[13.5px] text-ink-2">
          You can sign in with <span className="font-medium text-ink">{email}</span> once an admin approves it.
        </p>
        <Button className="mt-6" onClick={() => { setPending(false); setMode('signin'); }}>Back to sign in</Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-[26px] font-semibold text-ink leading-tight">
        {mode === 'signin' ? 'Sign in' : 'Request access'}
      </h2>
      <p className="mt-1 text-[13.5px] text-ink-2">
        {mode === 'signin'
          ? 'Use your work email. Your account opens the right desk.'
          : 'An admin approves new accounts before first sign-in.'}
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-md bg-bad-soft px-3 py-2.5 text-[13px] text-bad">
            <CircleAlert className="size-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {mode === 'request' && (
          <Field label="Full name" htmlFor="name" required>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" required />
          </Field>
        )}

        <Field label="Email" htmlFor="email" required>
          <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus required className="h-10" />
        </Field>

        <Field label="Password" htmlFor="password" required hint={mode === 'request' ? 'At least 8 characters' : undefined}>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={mode === 'request' ? 8 : undefined}
            required
            className="h-10"
          />
        </Field>

        {mode === 'request' && (
          <fieldset>
            <legend className="block text-[12.5px] font-medium text-ink-2 mb-1.5">I need access to</legend>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['challans', 'Challan entry'],
                ['books', 'Book catalogue'],
              ] as const).map(([value, label]) => (
                <label
                  key={value}
                  className={cn(
                    'flex items-center gap-2 h-10 px-3 rounded-md border cursor-pointer text-[13px] transition-colors',
                    product === value ? 'border-accent bg-accent-soft text-ink' : 'border-line-strong text-ink-2 hover:bg-sunken'
                  )}
                >
                  <input type="radio" name="product" value={value} checked={product === value} onChange={() => setProduct(value)} className="accent-[var(--color-accent)]" />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-[12px] text-ink-3">CRM roles (manager, telecaller) are assigned by the admin.</p>
          </fieldset>
        )}

        <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-1 w-full">
          {mode === 'signin' ? 'Sign in' : 'Send request'}
          {!loading && <ArrowRight className="size-4" />}
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-ink-2">
        {mode === 'signin' ? 'New here? ' : 'Already approved? '}
        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'request' : 'signin'); setError(null); }}
          className="font-medium text-accent hover:underline underline-offset-2"
        >
          {mode === 'signin' ? 'Request access' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr] bg-paper">
      {/* Brand side */}
      <section className="hidden lg:flex flex-col justify-between border-r border-line px-14 py-12 bg-sunken/60">
        <div>
          <div className="font-deva text-[34px] font-bold text-ink leading-none">उपहार प्रकाशन</div>
          <div className="mt-2 text-[13px] text-ink-2 tracking-wide">Specimen distribution CRM</div>
        </div>

        <div className="max-w-md">
          <p className="font-serif text-[28px] leading-[1.2] text-ink">
            Every specimen handed to a teacher is the start of a relationship.
          </p>
          <div className="mt-10 border-t border-line-strong">
            {DESKS.map(d => (
              <div key={d.name} className="grid grid-cols-[140px_1fr] gap-4 py-3.5 border-b border-line">
                <div className="text-[13px] font-semibold text-ink">{d.name}</div>
                <div>
                  <div className="text-[13px] text-ink">{d.what}</div>
                  <div className="text-[12px] text-ink-3 mt-0.5">{d.who}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[12px] text-ink-3">Bihar · Jharkhand — restricted access</div>
      </section>

      {/* Form side */}
      <section className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="lg:hidden mb-10">
          <div className="font-deva text-[28px] font-bold text-ink leading-none">उपहार प्रकाशन</div>
          <div className="mt-1.5 text-[12.5px] text-ink-2">Specimen distribution CRM</div>
        </div>
        <div className="w-full max-w-[380px]">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

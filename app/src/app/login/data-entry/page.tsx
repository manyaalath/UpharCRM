'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'register';
type Status = 'idle' | 'pending_approval' | 'success';

export default function DataEntryLoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/de-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, name: mode === 'register' ? name : undefined, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      if (data.status === 'pending') {
        setStatus('pending_approval');
      } else if (data.status === 'approved') {
        router.push('/de');
        router.refresh();
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'pending_approval') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-amber-500 text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              pending
            </span>
          </div>
          <h2 className="text-[22px] font-bold text-slate-900 mb-2">Request Submitted</h2>
          <p className="text-slate-500 text-[14px] leading-relaxed mb-6">
            Your access request has been sent to the CRM admin. You will be able to log in once it is approved.
          </p>
          <Link href="/" className="text-[13px] text-[#1E40AF] hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200/60 overflow-hidden shadow-lg shadow-slate-200/50">
        {/* Header */}
        <div className="px-8 pt-10 pb-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center mb-4">
            <span
              className="material-symbols-outlined text-amber-600 text-[32px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              edit_note
            </span>
          </div>
          <h1 className="text-[26px] font-bold text-slate-900 text-center tracking-tight">
            Data Entry Portal
          </h1>
          <p className="text-[14px] text-slate-500 text-center mt-1">Uphar Prakashan</p>
          <div className="w-12 h-[2px] bg-amber-400 mt-5 rounded-full" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mx-8">
          <button
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors ${mode === 'login' ? 'text-[#1E40AF] border-b-2 border-[#1E40AF]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('register'); setError(null); }}
            className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors ${mode === 'register' ? 'text-[#1E40AF] border-b-2 border-[#1E40AF]' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Request Access
          </button>
        </div>

        {/* Form */}
        <div className="px-8 py-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {mode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your full name"
                  className="bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={mode === 'register' ? 'Create a password (min 6 chars)' : 'Your password'}
                className="bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-amber-500 text-white rounded-lg text-[14px] font-semibold hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  {mode === 'register' ? 'Submitting...' : 'Signing in...'}
                </span>
              ) : mode === 'register' ? (
                'Submit Access Request'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {mode === 'register' && (
            <p className="mt-4 text-[12px] text-slate-400 text-center">
              Your request will be reviewed by the CRM admin before access is granted.
            </p>
          )}

          <div className="mt-5 text-center">
            <Link href="/" className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

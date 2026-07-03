'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPendingMessage(false);

    try {
      // Try unified login first
      if (email) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (data.status === 'pending') {
          setPendingMessage(true);
          setLoading(false);
          return;
        }

        if (res.ok && data.status === 'approved') {
          // Route based on role
          const role = data.user?.role;
          if (role === 'data_entry') {
            router.push('/records');
          } else if (role === 'telecaller') {
            router.push('/follow-ups');
          } else {
            router.push('/dashboard');
          }
          router.refresh();
          return;
        }

        setError(data.error || 'Login failed');
      } else {
        // Legacy password-only CRM login
        const res = await fetch('/api/auth/crm-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        if (res.ok) {
          router.push('/dashboard');
          router.refresh();
          return;
        }

        const data = await res.json();
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-xl shadow-slate-200/50">
        {/* Header */}
        <div className="px-8 pt-10 pb-4 flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#DBEAFE] to-[#93C5FD]/30 rounded-2xl flex items-center justify-center mb-4 border border-[#1E40AF]/10 shadow-md shadow-blue-100">
            <span
              className="material-symbols-outlined text-[#1E40AF] text-[32px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              admin_panel_settings
            </span>
          </div>
          <h1 className="text-[28px] font-bold text-[#1E40AF] text-center tracking-tight">
            Uphar CRM
          </h1>
          <p className="text-[14px] text-slate-500 text-center mt-1">Sign in to your account</p>
          <div className="w-12 h-[2px] bg-gradient-to-r from-transparent via-[#1E40AF] to-transparent mt-5 rounded-full" />
        </div>

        {/* Form */}
        <div className="px-8 pb-10">
          {pendingMessage && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                Account Pending Approval
              </div>
              <p className="text-xs text-amber-700">Your account is awaiting admin approval. You&apos;ll be able to log in once approved.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                placeholder="your.email@company.com"
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-[15px] transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-[15px] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[#1E40AF] text-white rounded-xl text-[14px] font-semibold hover:bg-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E40AF] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200/50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-3">
            <Link
              href="/login/data-entry"
              className="text-[13px] text-[#1E40AF] hover:text-[#1E3A8A] font-semibold transition-colors"
            >
              Data Entry Portal Login →
            </Link>
            <Link href="/" className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

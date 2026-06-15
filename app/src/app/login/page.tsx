'use client';

import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const supabase = createClient();

  const authError = searchParams.get('error');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-xl border border-slate-200/60 overflow-hidden shadow-lg shadow-slate-200/50">
      {/* Header Section */}
      <div className="px-8 pt-10 pb-4 flex flex-col items-center">
        <div className="w-16 h-16 bg-[#DBEAFE] rounded-xl flex items-center justify-center mb-4 border border-[#1E40AF]/10">
          <span
            className="material-symbols-outlined text-[#1E40AF] text-[32px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            diversity_3
          </span>
        </div>
        <h1 className="text-[32px] font-bold text-[#1E40AF] text-center tracking-tight leading-tight">
          Uphar CRM
        </h1>
        <p className="text-[14px] text-slate-500 text-center mt-1">
          Specimen Distribution CRM
        </p>
        <div className="w-12 h-[2px] bg-[#1E40AF] mt-6 rounded-full" />
      </div>

      {/* Form Section */}
      <div className="px-8 pb-10">
        <h2 className="text-[20px] font-semibold mb-6 text-center text-slate-900">
          Sign In
        </h2>

        {/* Error Display */}
        {(error || authError) && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error || 'Authentication failed. Please try again.'}
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-[14px] font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1E40AF] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin text-[20px]">
              progress_activity
            </span>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        <div className="mt-8 text-center">
          <p className="text-[12px] text-slate-400">
            Secure access restricted to authorized Uphar personnel.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-slate-500">
            <span className="material-symbols-outlined animate-spin">
              progress_activity
            </span>
            Loading...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}

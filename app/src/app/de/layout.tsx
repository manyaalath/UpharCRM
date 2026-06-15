'use client';

import { useRouter } from 'next/navigation';

export default function DELayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'de' }),
    });
    router.push('/login/data-entry');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top bar */}
      <header className="flex justify-between items-center px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div>
          <span className="font-bold text-[16px] text-amber-600">Data Entry Portal</span>
          <span className="text-slate-400 text-[13px] ml-2">— Uphar Prakashan</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sign Out
        </button>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}

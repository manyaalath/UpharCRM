'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TopNav() {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="md:hidden flex justify-between items-center px-6 py-3 w-full bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="font-bold text-[24px] text-[#1E40AF] leading-tight" style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
        उपहार प्रकाशन
      </div>
      <div className="flex gap-2">
        <button className="p-2 text-slate-500 hover:text-[#1E40AF] transition-colors rounded-lg hover:bg-slate-50">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-slate-500 hover:text-[#1E40AF] transition-colors rounded-lg hover:bg-slate-50"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px] z-50">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

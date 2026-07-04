'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { UserRole } from '@/lib/types';
import { USER_ROLE_COLORS } from '@/lib/types';

interface DEUser {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

export default function TopNav() {
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<DEUser[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>('');
  const router = useRouter();
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPending();
    // Fetch current user info
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setUserRole(data.role as UserRole);
          setUserName(data.name || '');
        } else {
          setUserRole('admin');
          setUserName('Admin');
        }
      })
      .catch(() => {
        setUserRole('admin');
        setUserName('Admin');
      });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchPending = async () => {
    try {
      const res = await fetch('/api/de-requests?status=pending');
      const data = await res.json();
      if (data.data) setPendingUsers(data.data);
    } catch {
      // ignore
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await fetch('/api/de-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      await fetchPending();
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'crm' }),
    });
    router.push('/login');
    router.refresh();
  };

  const roleColors = userRole ? USER_ROLE_COLORS[userRole] : null;

  return (
    <header className="md:hidden flex justify-between items-center px-6 py-3 w-full bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="font-bold text-[24px] text-[#1E40AF] leading-tight" style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
        उपहार प्रकाशन
      </div>

      <div className="flex items-center gap-2">
        {/* User info badge */}
        {userRole && (
          <div className="hidden sm:flex items-center gap-2 mr-1">
            <span className="text-[12px] font-semibold text-slate-700 truncate max-w-[100px]">{userName}</span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${roleColors?.bg || ''} ${roleColors?.text || ''} border ${roleColors?.border || ''}`}>
              {userRole.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        )}

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); fetchPending(); }}
            className="p-2 text-slate-500 hover:text-[#1E40AF] transition-colors rounded-lg hover:bg-slate-50 relative"
          >
            <span className="material-symbols-outlined">notifications</span>
            {pendingUsers.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold leading-none">
                {pendingUsers.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-xl shadow-xl w-80 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[13px] font-bold text-slate-900">Access Requests</span>
                <Link href="/notifications" onClick={() => setShowNotifications(false)} className="text-[11px] text-[#1E40AF] hover:underline">
                  View all
                </Link>
              </div>

              {pendingUsers.length === 0 ? (
                <div className="px-4 py-6 text-center text-slate-500 text-[13px]">
                  No pending requests
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {pendingUsers.map((u) => (
                    <div key={u.id} className="px-4 py-3">
                      <p className="text-[13px] font-semibold text-slate-900">{u.name}</p>
                      <p className="text-[11px] text-slate-500 mb-2">{u.email}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(u.id, 'approve')}
                          disabled={actionLoading === u.id}
                          className="flex-1 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded text-[12px] font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === u.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleAction(u.id, 'reject')}
                          disabled={actionLoading === u.id}
                          className="flex-1 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded text-[12px] font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-slate-500 hover:text-[#1E40AF] transition-colors rounded-lg hover:bg-slate-50"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-12 bg-white border border-slate-200 rounded-xl shadow-xl py-2 min-w-[200px] z-50">
              {/* Mobile-only user info */}
              {userRole && (
                <div className="sm:hidden px-4 py-2 border-b border-slate-100 mb-1">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{userName}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold mt-1 ${roleColors?.bg || ''} ${roleColors?.text || ''} border ${roleColors?.border || ''}`}>
                    {userRole.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              )}
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

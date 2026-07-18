'use client';

import { useState, useEffect, useCallback } from 'react';

interface DEUser {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected';
type Portal = 'data_entry' | 'books';

export default function NotificationsPage() {
  const [users, setUsers] = useState<DEUser[]>([]);
  const [portal, setPortal] = useState<Portal>('data_entry');
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const endpoint = portal === 'books' ? '/api/book-requests' : '/api/de-requests';

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? endpoint : `${endpoint}?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.data) setUsers(data.data); else setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [filter, endpoint]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      await fetchUsers();
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    };
    return map[status] || '';
  };

  const filters: { label: string; value: Filter }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: 'all' },
  ];

  return (
    <div className="flex-grow flex flex-col items-center pb-24 md:pb-8 pt-4 md:pt-8 px-4 w-full">
      <div className="w-full max-w-[720px] flex flex-col gap-6">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900">Access Requests</h1>
          <hr className="h-[3px] bg-[#1E40AF] border-none mt-2 w-full rounded-full" />
        </div>

        {/* Portal toggle */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setPortal('data_entry')}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
              portal === 'data_entry' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Data Entry Portal
          </button>
          <button
            onClick={() => setPortal('books')}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
              portal === 'books' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Books Portal
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${
                filter === f.value
                  ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-[#1E40AF] hover:text-[#1E40AF]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-500">
            <span className="material-symbols-outlined text-[40px] block mb-2 text-slate-300">inbox</span>
            No requests found
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map(u => (
              <div key={u.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[15px] font-bold text-slate-900">{u.name}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge(u.status)}`}>
                      {u.status}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-500">{u.email}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Requested: {new Date(u.created_at).toLocaleString('en-IN')}
                  </p>
                </div>

                {u.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAction(u.id, 'approve')}
                      disabled={actionLoading === u.id}
                      className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[13px] font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === u.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleAction(u.id, 'reject')}
                      disabled={actionLoading === u.id}
                      className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[13px] font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

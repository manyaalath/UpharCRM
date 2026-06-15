'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.data) setAgents(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to add agent'); return; }
      setNewName('');
      fetchAgents();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center pb-24 md:pb-8 pt-4 md:pt-8 px-4 w-full">
      <div className="w-full max-w-[600px] flex flex-col gap-6">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900">Agents</h1>
          <hr className="h-[3px] bg-[#1E40AF] border-none mt-2 w-full rounded-full" />
        </div>

        {/* Add agent form */}
        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Agent name"
            className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] text-[14px]"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="px-5 py-2.5 bg-[#1E40AF] text-white rounded-lg text-[13px] font-semibold hover:bg-[#1e3a8a] transition-colors disabled:opacity-50"
          >
            {adding ? '...' : 'Add Agent'}
          </button>
        </form>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {/* Agents list */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500 gap-2">
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Loading...
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            {agents.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-sm">No agents yet.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#1E40AF]">
                    <th className="py-3 px-4 text-[13px] font-semibold text-white uppercase tracking-wider">Name</th>
                    <th className="py-3 px-4 text-[13px] font-semibold text-white uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-[13px] font-semibold text-white uppercase tracking-wider">Added</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-[14px] font-medium text-slate-900">{a.name}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border ${a.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {a.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[13px] text-slate-500">
                        {new Date(a.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

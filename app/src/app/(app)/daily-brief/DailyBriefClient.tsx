'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface RepWorkload {
  name: string;
  status: 'Overloaded' | 'Optimal' | 'Underutilized';
  note: string;
}

interface DailyBriefData {
  manager_briefing: string;
  today_priorities: string[];
  reps_workload: RepWorkload[];
  stale_leads_warning: string;
}

export default function DailyBriefClient() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DailyBriefData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateBrief = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/daily-brief', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch AI daily brief');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Overloaded': return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">Overloaded</span>;
      case 'Underutilized': return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Underutilized</span>;
      case 'Optimal': return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Optimal</span>;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 w-full">
        <div className="max-w-4xl mx-auto w-full pb-20">
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-[28px] md:text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <span className="material-symbols-outlined text-[#1E40AF] text-[36px]">lightbulb</span>
                AI Daily Brief
              </h1>
              <hr className="border-0 h-[2px] bg-[#1E40AF] w-full max-w-[100px] mt-1" />
              <p className="text-slate-500 mt-2 text-[14px]">Your AI Sales Manager&apos;s morning briefing</p>
            </div>
            
            <button
              onClick={generateBrief}
              disabled={loading}
              className="bg-[#1E40AF] hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg shadow-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
                {loading ? 'sync' : 'auto_awesome'}
              </span>
              {loading ? 'Analyzing...' : (data ? 'Refresh Brief' : 'Generate Brief')}
            </button>
          </header>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <p className="text-[14px] font-medium">{error}</p>
            </div>
          )}

          {!data && !loading && !error && (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                <span className="material-symbols-outlined text-indigo-500 text-[40px]">coffee</span>
              </div>
              <h2 className="text-[20px] font-bold text-slate-900 mb-2">Ready for today&apos;s briefing?</h2>
              <p className="text-[14px] text-slate-500 max-w-md mx-auto mb-6">
                Click &quot;Generate Brief&quot; to have the AI analyze today&apos;s workloads, overdue follow-ups, and stale leads to provide actionable priorities.
              </p>
              <button
                onClick={generateBrief}
                className="bg-[#1E40AF] hover:bg-blue-800 text-white px-6 py-3 rounded-lg shadow-md font-semibold transition-all"
              >
                Start Analysis
              </button>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Manager Briefing */}
              <div className="bg-white border-l-4 border-[#1E40AF] shadow-md rounded-r-xl p-6">
                <h3 className="text-[12px] uppercase tracking-widest text-[#1E40AF] font-bold mb-3">Morning Briefing</h3>
                <p className="text-[16px] text-slate-800 leading-relaxed font-medium">
                  &quot;{data.manager_briefing}&quot;
                </p>
              </div>

              {/* Priorities & Leads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-[15px] font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-500">priority_high</span>
                    Today&apos;s Top Priorities
                  </h3>
                  <ul className="space-y-3">
                    {data.today_priorities?.map((p, i) => (
                      <li key={i} className="flex gap-3 text-[14px] text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-[12px] shrink-0">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-[15px] font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">warning</span>
                    Stale Leads Warning
                  </h3>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-[14px] text-amber-900 font-medium">
                    {data.stale_leads_warning}
                  </div>
                  <div className="mt-4 text-center">
                    <Link href="/leads?status=inactive" className="text-[13px] font-bold text-[#1E40AF] hover:underline">
                      View Inactive Leads →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Rep Workload */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-[15px] font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500">groups</span>
                  Team Workload Analysis
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.reps_workload?.map((rep, i) => (
                    <div key={i} className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-[14px] text-slate-900">{rep.name}</h4>
                        {getStatusBadge(rep.status)}
                      </div>
                      <p className="text-[12px] text-slate-500 line-clamp-3" title={rep.note}>{rep.note}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

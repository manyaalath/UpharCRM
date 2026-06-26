'use client';

import React, { useState } from 'react';

interface DashboardAiData {
  executive_summary: string;
  top_districts: string[];
  attention_required: string[];
  urgent_actions: string[];
}

export default function DashboardAiSummary() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardAiData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/dashboard-summary', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch AI summary');
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl shadow-lg p-6 mb-8 text-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl mix-blend-overlay pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-purple-400 opacity-10 rounded-full blur-2xl mix-blend-overlay pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
              <span className="material-symbols-outlined text-amber-300">auto_awesome</span>
            </div>
            <div>
              <h2 className="text-[20px] font-bold tracking-tight text-white drop-shadow-sm">AI Business Summary</h2>
              <p className="text-[13px] text-indigo-200 font-medium">Llama 3 Powered Executive Insights</p>
            </div>
          </div>

          {!data && !loading && !error && (
            <div className="bg-black/20 rounded-lg p-5 border border-white/10 max-w-2xl">
              <p className="text-[14px] text-indigo-100 mb-4 leading-relaxed">
                Generate a real-time executive summary of your CRM data. The AI will analyze district coverage, book distribution, and pending follow-ups to provide actionable business intelligence.
              </p>
              <button 
                onClick={generateSummary}
                className="bg-white text-indigo-900 hover:bg-indigo-50 text-[14px] font-bold py-2.5 px-5 rounded-md shadow-md transition-all flex items-center gap-2 group"
              >
                <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">bolt</span>
                Generate Insights
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-4 bg-black/20 p-5 rounded-lg border border-white/10 w-max">
              <div className="relative w-8 h-8">
                <span className="material-symbols-outlined animate-spin absolute inset-0 text-[32px] text-indigo-300">sync</span>
              </div>
              <div>
                <p className="text-[14px] font-bold text-white">Analyzing CRM Data...</p>
                <p className="text-[12px] text-indigo-200">Aggregating district and book metrics</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-500/50 text-red-100 p-4 rounded-lg text-[14px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span className="font-bold">Generation Failed</span>
              </div>
              {error}
            </div>
          )}

          {data && !loading && (
            <div className="animate-in fade-in duration-700 slide-in-from-bottom-4">
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-5 mb-5 border border-white/20 shadow-inner">
                <p className="text-[15px] text-white leading-relaxed font-medium">
                  {data.executive_summary}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                  <h4 className="text-[12px] uppercase tracking-wider text-indigo-200 font-bold mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-400">trending_up</span>
                    Top Districts
                  </h4>
                  <ul className="space-y-2">
                    {data.top_districts.map((item, i) => (
                      <li key={i} className="text-[13px] text-white flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <span className="opacity-90 leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                  <h4 className="text-[12px] uppercase tracking-wider text-indigo-200 font-bold mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-amber-400">warning</span>
                    Needs Attention
                  </h4>
                  <ul className="space-y-2">
                    {data.attention_required.map((item, i) => (
                      <li key={i} className="text-[13px] text-white flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        <span className="opacity-90 leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                  <h4 className="text-[12px] uppercase tracking-wider text-indigo-200 font-bold mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-rose-400">priority_high</span>
                    Urgent Actions
                  </h4>
                  <ul className="space-y-2">
                    {data.urgent_actions.map((item, i) => (
                      <li key={i} className="text-[13px] text-white flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        <span className="opacity-90 leading-tight">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

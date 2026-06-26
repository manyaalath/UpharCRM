'use client';

import React, { useState } from 'react';

interface AiSummaryData {
  summary: string;
  engagement_score: number;
  sentiment: string;
  recommendations: string[];
  next_best_action: string;
  priority_level: string;
}

export default function LeadAiSummary({ leadId }: { leadId: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AiSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/lead-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch AI summary');
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (s: string) => {
    switch (s.toLowerCase()) {
      case 'positive': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'negative': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'at risk': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 shadow-sm rounded-lg p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-bold text-indigo-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-600">auto_awesome</span>
          AI Lead Summary
        </h3>
        {!data && !loading && (
          <button 
            onClick={generateSummary}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-bold py-1.5 px-3 rounded shadow-sm transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            Generate Insights
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-6 text-indigo-400">
          <span className="material-symbols-outlined animate-spin text-[32px] mb-2">sync</span>
          <p className="text-[13px] animate-pulse">Analyzing lead history...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded text-[13px] border border-red-100">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <p className="text-[14px] text-slate-800 leading-relaxed">
            {data.summary}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-md p-3 border border-indigo-100 shadow-sm flex flex-col items-center text-center">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Engagement</span>
              <span className="text-[20px] font-black text-indigo-700">{data.engagement_score}/10</span>
            </div>
            <div className="bg-white rounded-md p-3 border border-indigo-100 shadow-sm flex flex-col items-center text-center justify-center">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Sentiment</span>
              <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full border ${getSentimentColor(data.sentiment)}`}>
                {data.sentiment}
              </span>
            </div>
            <div className="bg-white rounded-md p-3 border border-indigo-100 shadow-sm flex flex-col items-center text-center justify-center">
              <span className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Priority</span>
              <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(data.priority_level)}`}>
                {data.priority_level}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-md p-4 border border-indigo-100 shadow-sm">
            <h4 className="text-[13px] font-bold text-slate-800 mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">lightbulb</span>
              Next Best Action
            </h4>
            <p className="text-[14px] text-slate-700 font-medium text-emerald-800 bg-emerald-50 p-2 rounded">
              {data.next_best_action}
            </p>
            
            <h4 className="text-[13px] font-bold text-slate-800 mt-4 mb-2">Recommendations</h4>
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-slate-700">
                  <span className="material-symbols-outlined text-[14px] text-indigo-400 mt-0.5">check_circle</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

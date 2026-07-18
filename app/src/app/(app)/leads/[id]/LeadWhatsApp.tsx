'use client';

import { useEffect, useState, useCallback } from 'react';

interface WaMessage {
  id: string;
  direction: string;
  template_name: string | null;
  status: string | null;
  error: string | null;
  created_at: string;
}
interface WaReply {
  id: string;
  reply_text: string | null;
  button_payload: string | null;
  classification: string | null;
  created_at: string;
}
interface WaData {
  whatsapp_status: string;
  reply_status: string;
  messages: WaMessage[];
  replies: WaReply[];
}

const WA_STATUS_STYLE: Record<string, string> = {
  not_sent: 'bg-slate-100 text-slate-600 border-slate-200',
  queued: 'bg-amber-50 text-amber-700 border-amber-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  read: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};
const REPLY_STATUS_STYLE: Record<string, string> = {
  awaiting: 'bg-slate-100 text-slate-600 border-slate-200',
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  negative: 'bg-red-50 text-red-700 border-red-200',
  no_response: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function LeadWhatsApp({ leadId, onChange }: { leadId: string; onChange?: () => void }) {
  const [data, setData] = useState<WaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/whatsapp`);
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [leadId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const simulate = async (reply: 'received' | 'not_received') => {
    setSimulating(reply);
    try {
      await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, reply }),
      });
      await fetchData();
      onChange?.();
    } catch { /* ignore */ }
    finally { setSimulating(null); }
  };

  const hasOutbound = (data?.messages || []).some(m => m.direction === 'outbound');

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
      <h4 className="text-[13px] font-bold text-emerald-700 uppercase tracking-wider mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px]">chat</span>
        WhatsApp
      </h4>

      {loading ? (
        <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
      ) : (
        <>
          {/* Status badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${WA_STATUS_STYLE[data?.whatsapp_status || 'not_sent']}`}>
              Delivery: {(data?.whatsapp_status || 'not_sent').replace('_', ' ')}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${REPLY_STATUS_STYLE[data?.reply_status || 'awaiting']}`}>
              Reply: {(data?.reply_status || 'awaiting').replace('_', ' ')}
            </span>
          </div>

          {/* Simulate reply (test tool — no live provider yet) */}
          {hasOutbound && data?.reply_status === 'awaiting' && (
            <div className="mb-4 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
              <p className="text-[11px] text-slate-500 mb-2 font-semibold">Simulate customer reply (test):</p>
              <div className="flex gap-2">
                <button
                  onClick={() => simulate('received')}
                  disabled={!!simulating}
                  className="flex-1 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[12px] font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  {simulating === 'received' ? '...' : 'Received'}
                </button>
                <button
                  onClick={() => simulate('not_received')}
                  disabled={!!simulating}
                  className="flex-1 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded text-[12px] font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {simulating === 'not_received' ? '...' : 'Not Received'}
                </button>
              </div>
            </div>
          )}

          {/* Message history */}
          {(data?.messages || []).length === 0 ? (
            <p className="text-[12px] text-slate-400 italic">No WhatsApp messages yet.</p>
          ) : (
            <div className="space-y-2">
              {data!.messages.map(m => (
                <div key={m.id} className="text-[12px] flex items-start gap-2">
                  <span className="material-symbols-outlined text-[15px] text-slate-400 mt-0.5">outgoing_mail</span>
                  <div className="flex-1">
                    <span className="text-slate-700">Template <span className="font-mono">{m.template_name}</span></span>
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${WA_STATUS_STYLE[m.status || 'sent'] || ''}`}>{m.status}</span>
                    {m.error && <span className="text-red-500 block text-[11px]">{m.error}</span>}
                    <span className="block text-[10px] text-slate-400">{new Date(m.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Replies */}
          {(data?.replies || []).length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Replies</p>
              {data!.replies.map(r => (
                <div key={r.id} className="text-[12px] flex items-start gap-2">
                  <span className="material-symbols-outlined text-[15px] text-emerald-500 mt-0.5">reply</span>
                  <div className="flex-1">
                    <span className="text-slate-800">&ldquo;{r.button_payload || r.reply_text}&rdquo;</span>
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${REPLY_STATUS_STYLE[r.classification === 'unknown' ? 'awaiting' : (r.classification || 'awaiting')] || ''}`}>{r.classification}</span>
                    <span className="block text-[10px] text-slate-400">{new Date(r.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

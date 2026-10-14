'use client';

import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { Button, Panel, cn } from '@/components/ui';
import { formatDateTime } from '@/lib/date';

interface DashboardAiData {
  executive_summary: string;
  top_districts: string[];
  attention_required: string[];
  urgent_actions: string[];
}

// Collapsed by default; generates on demand from the same filtered numbers.
export default function DashboardAiSummary({ query }: { query: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DashboardAiData | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; notConfigured?: boolean } | null>(null);

  const generate = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/dashboard-summary?${query}`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: json.error || 'Could not generate a summary.', notConfigured: json.code === 'ai_not_configured' });
        return;
      }
      setData(json.data);
      setGeneratedAt(json.generated_at || new Date().toISOString());
    } catch {
      setError({ message: 'Could not reach the server.' });
    } finally {
      setLoading(false);
    }
  };

  const lists: { title: string; items?: string[] }[] = data
    ? [
        { title: 'Strong districts', items: data.top_districts },
        { title: 'Needs attention', items: data.attention_required },
        { title: 'Do next', items: data.urgent_actions },
      ]
    : [];

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3 px-4 h-11">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 min-w-0 text-left"
          aria-expanded={open}
          disabled={!data && !error}
        >
          <Sparkles className="size-4 text-ink-3 shrink-0" aria-hidden />
          <span className="text-[13.5px] font-semibold text-ink">AI summary</span>
          <span className="text-[12px] text-ink-3 truncate">
            {generatedAt ? `Generated ${formatDateTime(generatedAt)} · machine-written, check before acting` : 'Written by AI from the numbers on this page'}
          </span>
          {(data || error) && <ChevronDown className={cn('size-4 text-ink-3 transition-transform', open && 'rotate-180')} />}
        </button>
        <Button size="sm" onClick={generate} loading={loading}>
          {data ? 'Regenerate' : 'Generate'}
        </Button>
      </div>

      {open && (loading || error || data) && (
        <div className="border-t border-line px-4 py-4">
          {loading && !data && <p className="text-[13px] text-ink-2">Reading the current numbers…</p>}

          {error && (
            <p className={cn('text-[13px]', error.notConfigured ? 'text-ink-2' : 'text-bad')}>
              {error.message}
              {error.notConfigured && ' Ask the admin to add the key in the deployment settings.'}
            </p>
          )}

          {data && (
            <div className={cn('transition-opacity', loading && 'opacity-50')}>
              <p className="text-[14px] leading-relaxed text-ink max-w-[80ch]">{data.executive_summary}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {lists.map(l => (
                  <div key={l.title}>
                    <h3 className="text-[12px] font-semibold text-ink-2 mb-1.5">{l.title}</h3>
                    <ul className="space-y-1.5">
                      {(l.items || []).map((item, i) => (
                        <li key={i} className="text-[13px] text-ink leading-snug pl-3 relative before:absolute before:left-0 before:top-[0.6em] before:size-1 before:rounded-full before:bg-ink-3">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}

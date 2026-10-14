'use client';

import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { Badge, Button, cn, type Tone } from '@/components/ui';
import { formatDateTime } from '@/lib/date';

interface AiSummaryData {
  summary: string;
  engagement_score: number;
  sentiment: string;
  recommendations: string[];
  next_best_action: string;
  priority_level: string;
}

const SENTIMENT_TONE: Record<string, Tone> = { positive: 'ok', neutral: 'neutral', negative: 'bad', 'at risk': 'bad' };
const PRIORITY_TONE: Record<string, Tone> = { high: 'bad', medium: 'warn', low: 'neutral' };

// AI read of the lead's history. Collapsed until asked for — it costs an API call.
export default function LeadAiSummary({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AiSummaryData | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; setup?: boolean } | null>(null);

  const generate = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/lead-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: json.error || 'Could not generate a summary', setup: json.code === 'ai_not_configured' });
        return;
      }
      setData(json.data);
      setGeneratedAt(json.generated_at || new Date().toISOString());
    } catch {
      setError({ message: 'Could not reach the server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-line">
      <div className="flex items-center justify-between gap-2 px-4 h-11">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-ink"
          aria-expanded={open}
        >
          <Sparkles className="size-3.5 text-ink-3" />
          AI read
          <ChevronDown className={cn('size-3.5 text-ink-3 transition-transform', open && 'rotate-180')} />
        </button>
        <div className="flex items-center gap-2">
          {generatedAt && <span className="text-[11.5px] text-ink-3">{formatDateTime(generatedAt)}</span>}
          <Button size="sm" variant={data ? 'ghost' : 'secondary'} onClick={generate} loading={loading}>
            {data ? 'Refresh' : 'Generate'}
          </Button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4">
          {loading && !data && <p className="text-[12.5px] text-ink-3">Reading call and visit history…</p>}

          {error && (
            <p className={cn('text-[12.5px]', error.setup ? 'text-ink-2' : 'text-bad')}>{error.message}</p>
          )}

          {!loading && !error && !data && (
            <p className="text-[12.5px] text-ink-3">Summarises visits, calls and complaints and suggests the next step.</p>
          )}

          {data && (
            <div className={cn('space-y-3', loading && 'opacity-60')}>
              <p className="text-[13px] leading-relaxed text-ink">{data.summary}</p>

              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral">Engagement <span className="font-mono">{data.engagement_score}/10</span></Badge>
                <Badge tone={SENTIMENT_TONE[data.sentiment?.toLowerCase()] || 'neutral'}>{data.sentiment}</Badge>
                <Badge tone={PRIORITY_TONE[data.priority_level?.toLowerCase()] || 'neutral'}>{data.priority_level} priority</Badge>
              </div>

              <div className="rounded-md bg-sunken px-3 py-2.5">
                <p className="text-[11.5px] font-medium text-ink-3">Next step</p>
                <p className="mt-0.5 text-[13px] font-medium text-ink">{data.next_best_action}</p>
              </div>

              {data.recommendations?.length > 0 && (
                <ul className="space-y-1 text-[12.5px] text-ink-2 list-disc pl-4 marker:text-ink-3">
                  {data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

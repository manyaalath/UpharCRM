'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Panel, PanelHeader, Skeleton, type Tone } from '@/components/ui';

interface WaData {
  whatsapp_status: string;
  reply_status: string;
  messages: { id: string; direction: string }[];
  stub: boolean;
  can_simulate: boolean;
}

const DELIVERY_TONE: Record<string, Tone> = {
  not_sent: 'neutral', queued: 'warn', sent: 'info', delivered: 'info', read: 'ok', failed: 'bad',
};
const REPLY_TONE: Record<string, Tone> = {
  awaiting: 'neutral', positive: 'ok', negative: 'bad', no_response: 'warn',
};
const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());

// WhatsApp delivery + reply state for a lead. Individual messages and replies
// appear in the lead's History timeline.
export default function LeadWhatsApp({ leadId, onChange }: { leadId: string; onChange?: () => void }) {
  const [data, setData] = useState<WaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/leads/${leadId}/whatsapp`);
      const json = await res.json();
      if (json.data) setData(json.data);
    } catch { /* panel shows last known state */ }
    finally { setLoading(false); }
  }, [leadId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const simulate = async (reply: 'received' | 'not_received') => {
    setSimulating(reply);
    try {
      const res = await fetch('/api/whatsapp/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, reply }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Simulation failed');
      await fetchData();
      onChange?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Simulation failed');
    } finally {
      setSimulating(null);
    }
  };

  const hasOutbound = (data?.messages || []).some(m => m.direction === 'outbound');
  const delivery = data?.whatsapp_status || 'not_sent';
  const reply = data?.reply_status || 'awaiting';

  return (
    <Panel>
      <PanelHeader title="WhatsApp" meta={data?.stub ? 'Test mode — messages are logged, not sent' : undefined} />
      <div className="p-4">
        {loading ? (
          <Skeleton className="h-5 w-48" />
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={DELIVERY_TONE[delivery] || 'neutral'} dot>Delivery: {label(delivery)}</Badge>
              <Badge tone={REPLY_TONE[reply] || 'neutral'} dot>Reply: {label(reply)}</Badge>
            </div>

            {data?.can_simulate && hasOutbound && reply === 'awaiting' && (
              <div className="mt-3 rounded-md border border-dashed border-line-strong p-3">
                <p className="text-[12px] text-ink-3 mb-2">Test tool — simulate the customer&apos;s reply</p>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" loading={simulating === 'received'} disabled={!!simulating} onClick={() => simulate('received')}>
                    Received
                  </Button>
                  <Button size="sm" className="flex-1" loading={simulating === 'not_received'} disabled={!!simulating} onClick={() => simulate('not_received')}>
                    Not received
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}

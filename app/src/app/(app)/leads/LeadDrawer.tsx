'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Drawer, LinkButton } from '@/components/ui';
import LeadAiSummary from './[id]/LeadAiSummary';
import { leadView, type LeadRow } from './_components/leadFields';
import { BooksGiven, LeadActionBar, LeadFacts, LeadTitle, PhoneActions, useLeadTimeline } from './_components/LeadProfile';
import { LeadTimeline } from './_components/LeadTimeline';

// Quick look at a lead from the list. Full page has the same data, laid out wider.
export default function LeadDrawer({
  lead, onClose, onLeadUpdated,
}: {
  lead: LeadRow | null;
  onClose: () => void;
  onLeadUpdated?: (patch: Partial<LeadRow> & { id: string }) => void;
}) {
  const [current, setCurrent] = useState<LeadRow | null>(lead);
  useEffect(() => setCurrent(lead), [lead]);

  const timeline = useLeadTimeline(lead?.id ?? null);
  const { reload } = timeline;

  // A logged call can change status / last contact server-side — pull them back.
  const refreshLead = useCallback(async () => {
    if (!lead) return;
    reload();
    try {
      const res = await fetch(`/api/leads/${lead.id}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setCurrent(c => (c ? { ...c, ...json.data } : c));
        onLeadUpdated?.({
          id: lead.id,
          status: json.data.status,
          last_contact_date: json.data.last_contact_date,
          next_followup_date: json.data.next_followup_date,
        });
      }
    } catch { /* timeline still refreshed */ }
  }, [lead, reload, onLeadUpdated]);

  if (!current) return null;
  const view = leadView(current);

  return (
    <Drawer
      open={!!lead}
      onClose={onClose}
      title={<LeadTitle view={view} />}
      subtitle={view.institute}
      actions={
        <LinkButton href={`/leads/${view.id}`} variant="ghost" size="sm" icon={<ArrowUpRight className="size-3.5" />}>
          Open
        </LinkButton>
      }
    >
      <div className="px-5 py-4 space-y-4 border-b border-line">
        <PhoneActions mobile={view.mobile} />
        <LeadActionBar
          view={view}
          onStatusChange={status => {
            setCurrent(c => (c ? { ...c, status } : c));
            onLeadUpdated?.({ id: view.id, status });
            timeline.reload();
          }}
          onLogged={refreshLead}
        />
      </div>

      <div className="px-5 py-4 border-b border-line">
        <LeadFacts view={view} />
      </div>

      <div className="px-5 py-4">
        <h3 className="text-[12.5px] font-semibold text-ink-2 mb-1.5">
          Books given
          {timeline.data && timeline.data.totals.books > 0 && (
            <span className="ml-1.5 font-mono font-normal text-ink-3">{timeline.data.totals.books}</span>
          )}
        </h3>
        <BooksGiven books={timeline.data?.books} loading={timeline.loading} />
      </div>

      <LeadAiSummary key={view.id} leadId={view.id} />

      <div className="px-5 py-4 border-t border-line">
        <h3 className="text-[12.5px] font-semibold text-ink-2 mb-3">History</h3>
        {timeline.error ? (
          <p className="text-[12.5px] text-bad">{timeline.error}</p>
        ) : (
          <LeadTimeline items={timeline.data?.items ?? null} loading={timeline.loading} />
        )}
      </div>
    </Drawer>
  );
}

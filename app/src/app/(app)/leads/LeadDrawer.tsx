'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Drawer, LinkButton, PanelSection } from '@/components/ui';
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

  // The list row is a summary. Pull the full record (address, alt phone, next follow-up) on open.
  const leadId = lead?.id ?? null;
  useEffect(() => {
    if (!leadId) return;
    const ac = new AbortController();
    fetch(`/api/leads/${leadId}`, { signal: ac.signal })
      .then(res => (res.ok ? res.json() : null))
      .then(json => { if (json?.data) setCurrent(c => (c && c.id === leadId ? { ...c, ...json.data } : c)); })
      .catch(() => { /* the summary row is still shown */ });
    return () => ac.abort();
  }, [leadId]);

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
      <div className="px-4 sm:px-5 py-4 space-y-4 border-b border-line">
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

      <div className="sm:px-1">
        <PanelSection title="Details">
          <LeadFacts view={view} />
        </PanelSection>

        <PanelSection title="Books given" meta={timeline.data && timeline.data.totals.books > 0 ? timeline.data.totals.books : undefined}>
          <BooksGiven books={timeline.data?.books} loading={timeline.loading} />
        </PanelSection>

        <LeadAiSummary key={view.id} leadId={view.id} />

        <PanelSection title="History">
          {timeline.error ? (
            <p className="text-[12.5px] text-bad">{timeline.error}</p>
          ) : (
            <LeadTimeline items={timeline.data?.items ?? null} loading={timeline.loading} />
          )}
        </PanelSection>
      </div>
    </Drawer>
  );
}

'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { LeadStatusBadge, Page, Panel, PanelHeader, PanelSection } from '@/components/ui';
import LeadAiSummary from './LeadAiSummary';
// import LeadWhatsApp from './LeadWhatsApp'; // parked — see WHATSAPP_INTEGRATION.md
import { leadView, type LeadRow } from '../_components/leadFields';
import { BooksGiven, LeadActionBar, LeadFacts, PhoneActions, useLeadTimeline } from '../_components/LeadProfile';
import { LeadTimeline } from '../_components/LeadTimeline';

export default function LeadDetailClient({ lead: initial }: { lead: LeadRow }) {
  const [lead, setLead] = useState<LeadRow>(initial);
  const timeline = useLeadTimeline(lead.id);
  const { reload } = timeline;
  const view = leadView(lead);

  // After a call/follow-up, status and dates may change server-side.
  const refresh = useCallback(async () => {
    reload();
    try {
      const res = await fetch(`/api/leads/${initial.id}`);
      const json = await res.json();
      if (res.ok && json.data) setLead(json.data);
    } catch { /* keep current view */ }
  }, [reload, initial.id]);

  return (
    <Page>
      <Link href="/leads" className="inline-flex items-center gap-1 h-9 md:h-auto -ml-1 pr-2 text-[13px] md:text-[12.5px] text-ink-2 hover:text-ink mb-1 md:mb-3">
        <ChevronLeft className="size-4 md:size-3.5" /> Leads
      </Link>

      {/* Who this is and what you can do — on the page itself, not boxed in a card. */}
      <header className="mb-5 md:mb-6 pb-5 border-b border-line">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="font-serif text-[26px] md:text-[30px] leading-tight font-semibold text-ink tracking-[-0.01em]">{view.contact}</h1>
          <LeadStatusBadge status={view.status} />
        </div>
        <p className="mt-1 text-[13.5px] text-ink-2">
          {view.institute}
          <span className="text-ink-3"> · {[view.town, view.district].filter(Boolean).join(', ')}</span>
        </p>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <PhoneActions mobile={view.mobile} />
          <LeadActionBar
            view={view}
            onStatusChange={status => { setLead(l => ({ ...l, status })); reload(); }}
            onLogged={refresh}
          />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <Panel className="min-w-0 order-2 lg:order-1">
          <PanelHeader
            title="History"
            meta={timeline.data ? `${timeline.data.totals.challans} visits · ${timeline.data.totals.calls} calls` : undefined}
          />
          <div className="p-4">
            {timeline.error ? (
              <p className="text-[12.5px] text-bad">{timeline.error}</p>
            ) : (
              <LeadTimeline items={timeline.data?.items ?? null} loading={timeline.loading} />
            )}
          </div>
        </Panel>

        {/* One surface, three sections split by hairlines. */}
        <Panel as="aside" className="order-1 lg:order-2">
          <PanelSection title="Details">
            <LeadFacts view={view} />
          </PanelSection>
          <PanelSection
            title="Books given"
            meta={timeline.data && timeline.data.totals.books > 0 ? `${timeline.data.totals.books} copies` : undefined}
          >
            <BooksGiven books={timeline.data?.books} loading={timeline.loading} />
          </PanelSection>
          <LeadAiSummary leadId={view.id} />
          {/* <LeadWhatsApp leadId={view.id} onChange={reload} /> */}
        </Panel>
      </div>
    </Page>
  );
}

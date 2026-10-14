'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { LeadStatusBadge, Page, Panel, PanelHeader } from '@/components/ui';
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
      <Link href="/leads" className="inline-flex items-center gap-1 text-[12.5px] text-ink-2 hover:text-ink mb-3">
        <ChevronLeft className="size-3.5" /> Leads
      </Link>

      <header className="mb-5 md:mb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="font-serif text-[26px] md:text-[30px] leading-tight font-semibold text-ink tracking-[-0.01em]">{view.contact}</h1>
          <LeadStatusBadge status={view.status} />
        </div>
        <p className="mt-1 text-[13.5px] text-ink-2">
          {view.institute}
          <span className="text-ink-3"> · {[view.town, view.district].filter(Boolean).join(', ')}</span>
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
        <div className="space-y-4 min-w-0">
          <Panel className="p-4 space-y-4">
            <PhoneActions mobile={view.mobile} />
            <LeadActionBar
              view={view}
              onStatusChange={status => { setLead(l => ({ ...l, status })); reload(); }}
              onLogged={refresh}
            />
          </Panel>

          <Panel>
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
        </div>

        <aside className="space-y-4">
          <Panel>
            <PanelHeader title="Details" />
            <div className="p-4"><LeadFacts view={view} /></div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Books given"
              meta={timeline.data && timeline.data.totals.books > 0 ? `${timeline.data.totals.books} copies` : undefined}
            />
            <div className="px-4 py-2"><BooksGiven books={timeline.data?.books} loading={timeline.loading} /></div>
          </Panel>

          <Panel className="overflow-hidden [&>div]:border-t-0">
            <LeadAiSummary leadId={view.id} />
          </Panel>

          {/* <LeadWhatsApp leadId={view.id} onChange={reload} /> */}
        </aside>
      </div>
    </Page>
  );
}

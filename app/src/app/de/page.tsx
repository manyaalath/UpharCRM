'use client';

import { useState } from 'react';
import { FileSpreadsheet, PenLine } from 'lucide-react';
import { Page, PageHeader, cn } from '@/components/ui';
import ChallanForm from './ChallanForm';
import BulkImportLeads from './BulkImportLeads';

type View = 'entry' | 'import';

export default function DataEntryPage() {
  const [view, setView] = useState<View>('entry');

  const choose = (v: View) => setView(v);

  return (
    <Page>
      <PageHeader
        title={view === 'entry' ? 'New challan' : 'Import from Excel'}
        description={
          view === 'entry'
            ? 'Key in a paper challan in the order it is printed. A follow-up is scheduled 15 days after the visit.'
            : 'Upload a filled template. Nothing is saved until you review duplicates and errors.'
        }
        actions={
          <div role="tablist" aria-label="Entry mode" className="inline-flex rounded-md border border-line-strong bg-surface p-0.5">
            {([
              ['entry', 'Single challan', PenLine],
              ['import', 'Excel import', FileSpreadsheet],
            ] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => choose(v)}
                className={cn(
                  'inline-flex items-center gap-1.5 h-7.5 px-3 rounded-[5px] text-[13px] font-medium transition-colors',
                  view === v ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        }
      />
      {view === 'entry' ? <ChallanForm /> : <BulkImportLeads />}
    </Page>
  );
}

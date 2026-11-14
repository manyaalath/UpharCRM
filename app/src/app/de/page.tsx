'use client';

import { useState } from 'react';
import { FileSpreadsheet, PenLine } from 'lucide-react';
import { Page, PageHeader, Segmented } from '@/components/ui';
import ChallanForm from './ChallanForm';
import BulkImportLeads from './BulkImportLeads';

type View = 'entry' | 'import';

export default function DataEntryPage() {
  const [view, setView] = useState<View>('entry');

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
          <Segmented<View>
            label="Entry mode"
            full
            value={view}
            onChange={setView}
            options={[
              { value: 'entry', label: 'Single challan', icon: <PenLine className="size-3.5" /> },
              { value: 'import', label: 'Excel import', icon: <FileSpreadsheet className="size-3.5" /> },
            ]}
          />
        }
      />
      {view === 'entry' ? <ChallanForm /> : <BulkImportLeads />}
    </Page>
  );
}

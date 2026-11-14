import { Page, Panel, Skeleton } from '@/components/ui';

// Shown inside the shell while a CRM screen's server data loads, so navigation feels instant.
export default function Loading() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2.5 h-4 w-72 max-w-full" />
        <Panel className="mt-6 p-4 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </Panel>
      </div>
    </Page>
  );
}

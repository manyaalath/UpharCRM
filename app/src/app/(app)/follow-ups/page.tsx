import { Suspense } from 'react';
import type { Metadata } from 'next';
import FollowUpsClient from './FollowUpsClient';

export const metadata: Metadata = {
  title: 'Follow-ups · Uphar CRM',
  description: 'Call queue and follow-up schedule for specimen leads',
};

export default function FollowUpsPage() {
  return (
    <Suspense>
      <FollowUpsClient />
    </Suspense>
  );
}

import type { Metadata } from 'next';
import DailyBriefClient from './DailyBriefClient';

export const metadata: Metadata = {
  title: 'Daily brief',
  description: 'Morning summary of follow-ups, overdue calls and rep workload.',
};

export default function DailyBriefPage() {
  return <DailyBriefClient />;
}

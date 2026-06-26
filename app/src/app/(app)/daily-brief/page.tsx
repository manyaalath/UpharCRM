import DailyBriefClient from './DailyBriefClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Daily Brief | Uphar CRM',
  description: 'AI-generated daily operational briefing for the sales team.',
};

export default function DailyBriefPage() {
  return <DailyBriefClient />;
}

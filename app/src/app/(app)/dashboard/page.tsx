import DashboardClient from './DashboardClient';
import { RANGES, type RangeKey } from './ranges';

export const metadata = {
  title: 'Overview · Uphar CRM',
  description: 'Specimen distribution at a glance: challans, leads, books, districts and reps.',
};

type SP = Record<string, string | string[] | undefined>;
const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const range = (RANGES.some(r => r.key === str(sp.range)) ? str(sp.range) : '30d') as RangeKey;
  return <DashboardClient initialRange={range} initialDistrict={str(sp.district)} />;
}

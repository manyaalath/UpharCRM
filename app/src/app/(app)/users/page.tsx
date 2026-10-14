import { requireSession } from '@/lib/session';
import UsersClient from './UsersClient';

export const metadata = { title: 'Users & access · Uphar CRM' };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireSession(['admin']);
  const { tab } = await searchParams;
  return <UsersClient selfId={session.src === 'staff' ? session.uid : null} initialTab={tab} />;
}

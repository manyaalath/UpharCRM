import { requireSession } from '@/lib/session';
import PortalHeader from './PortalHeader';

export default async function DELayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(['admin', 'manager', 'data_entry']);

  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col">
      <PortalHeader product="Challan entry" name={session.name} role={session.role} />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

import { requireSession } from '@/lib/session';
import PortalHeader from '@/app/de/PortalHeader';

export default async function BooksLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(['admin', 'books']);

  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col">
      <PortalHeader product="Book catalogue" name={session.name} role={session.role} />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}

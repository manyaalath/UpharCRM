import Shell from '@/components/shell/Shell';
import { requireSession } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';

// Pending access requests, shown as a badge for admins.
async function pendingCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const [staff, books] = await Promise.all([
      supabase.from('data_entry_users').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('book_entry_users').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    return (staff.count || 0) + (books.count || 0);
  } catch {
    return 0;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession(['admin', 'manager', 'telecaller']);
  const pending = session.role === 'admin' ? await pendingCount() : 0;

  return (
    <Shell user={{ name: session.name, role: session.role, email: session.email }} pendingCount={pending}>
      {children}
    </Shell>
  );
}

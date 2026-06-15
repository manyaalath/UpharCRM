import Sidebar from '@/components/Sidebar';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      <Sidebar />
      <TopNav />
      <main className="flex-1 flex flex-col min-w-0 md:ml-[260px] pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

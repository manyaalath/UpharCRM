'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DashboardAiSummary from './DashboardAiSummary';

// ── Types ──
interface FollowUpLead {
  id: string;
  contact_person: string;
  institute_name: string;
  district: string;
  mobile_no: string;
}

interface FollowUpItem {
  id: string;
  followup_date: string;
  status: string;
  lead: FollowUpLead;
}

interface DashboardData {
  summary: {
    total_challans: number;
    total_leads: number;
    pending_followups: number;
    books_distributed: number;
    districts_covered: number;
  };
  districtData: { district: string; challan_count: number; lead_count: number; followup_count: number }[];
  bookData: { book_name: string; distribution_count: number; unique_leads: number; repeat_count: number }[];
  representativeData: { representative_name: string; challan_count: number; lead_count: number; interested_count: number; followups_completed: number; performance_score: number }[];
  followUpQueue: {
    due_today: FollowUpItem[];
    overdue: FollowUpItem[];
    upcoming: FollowUpItem[];
    completed: FollowUpItem[];
  };
  leadIntelligence: {
    topInstitutions: { name: string; count: number; district: string; last_visit: string }[];
    topTeachers: { name: string; count: number; district: string; last_visit: string }[];
    leadCategories: { hot: number; warm: number; cold: number };
  };
  leadStatusData: { status: string; count: number }[];
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'district', label: 'District', icon: 'map' },
  { id: 'books', label: 'Books', icon: 'menu_book' },
  { id: 'representatives', label: 'Representatives', icon: 'group' },
  { id: 'followups', label: 'Follow-Ups', icon: 'task_alt' },
  { id: 'intelligence', label: 'Intelligence', icon: 'psychology' },
];

const STATUS_COLORS: Record<string, string> = {
  new: '#6366F1', contacted: '#3B82F6', interested: '#10B981',
  followup_pending: '#F59E0B', not_interested: '#EF4444', closed: '#6B7280',
};
const CHART_COLORS = ['#1E40AF', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'];

const AUTO_REFRESH_INTERVAL = 60_000; // 60 seconds

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-[12px] font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Loading Skeleton ──
function DashboardSkeleton() {
  return (
    <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6 w-full max-w-[1600px] mx-auto animate-pulse">
      <div className="mb-6">
        <div className="h-8 w-48 bg-slate-200 rounded mb-2" />
        <div className="h-[2px] w-[200px] bg-slate-200" />
      </div>
      <div className="flex gap-1 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 w-28 bg-slate-200 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 min-h-[110px]">
            <div className="flex items-center justify-between mb-4">
              <div className="h-3 w-20 bg-slate-200 rounded" />
              <div className="h-5 w-5 bg-slate-200 rounded" />
            </div>
            <div className="h-8 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 col-span-1 lg:col-span-2 h-[280px]">
          <div className="h-4 w-48 bg-slate-200 rounded mb-4" />
          <div className="h-[220px] bg-slate-100 rounded" />
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 h-[280px]">
          <div className="h-4 w-28 bg-slate-200 rounded mb-4" />
          <div className="h-[180px] bg-slate-100 rounded-full w-[180px] mx-auto" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const fetchData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const json = await res.json();
      setData(json);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch + auto-refresh interval
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchData]);

  // BroadcastChannel listener for cross-tab refresh
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('dashboard-refresh');
      channelRef.current = channel;

      channel.onmessage = () => {
        fetchData();
      };

      return () => {
        channel.close();
        channelRef.current = null;
      };
    } catch {
      // BroadcastChannel not supported — fall back to interval only
    }
  }, [fetchData]);

  // ── Loading State ──
  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  // ── Error State ──
  if (error && !data) {
    return (
      <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6 w-full max-w-[1600px] mx-auto flex items-center justify-center min-h-[400px]">
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 max-w-md w-full text-center">
          <span className="material-symbols-outlined text-[48px] text-red-400 mb-3 block">error</span>
          <h3 className="text-[18px] font-bold text-slate-900 mb-2">Failed to Load Dashboard</h3>
          <p className="text-[14px] text-slate-500 mb-6">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetchData(); }}
            className="px-6 py-2.5 bg-[#1E40AF] text-white rounded-lg text-[13px] font-bold hover:bg-[#1E3A8A] transition-colors shadow-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, districtData, bookData, representativeData, followUpQueue, leadIntelligence, leadStatusData } = data;
  const totalFollowUpItems = followUpQueue.due_today.length + followUpQueue.overdue.length + followUpQueue.upcoming.length;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto w-full pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[28px] md:text-[32px] font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <hr className="border-0 h-[2px] bg-[#1E40AF] w-full max-w-[100px] mt-1" />
        </div>
        <div className="flex items-center gap-4 text-[13px] text-slate-600 font-medium">
          <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[11px] text-slate-400 hidden md:block">
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/export?type=analytics&analytics_type=all');
                if (!res.ok) { alert('Export failed'); return; }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `analytics_export_${new Date().toISOString().split('T')[0]}.xlsx`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } catch { alert('Export failed'); }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[12px] font-semibold hover:bg-slate-50 transition-colors"
            title="Export analytics as Excel"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export
          </button>
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-[12px] font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#1E40AF] text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
            {tab.id === 'followups' && totalFollowUpItems > 0 && (
              <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{totalFollowUpItems}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ Section A: Overview ═══════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <DashboardAiSummary />
          {/* KPI Cards */}
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Challans', value: summary.total_challans, icon: 'receipt_long', color: '#1E40AF', href: '/records' },
              { label: 'Leads', value: summary.total_leads, icon: 'people', color: '#7C3AED', href: '/leads' },
              { label: 'Pending Follow-Ups', value: summary.pending_followups, icon: 'pending_actions', color: '#F59E0B', href: '/leads' }, // Routing to leads page for now
              { label: 'Books Distributed', value: summary.books_distributed, icon: 'menu_book', color: '#10B981' },
              { label: 'Districts Covered', value: summary.districts_covered, icon: 'location_on', color: '#EC4899' },
            ].map(kpi => (
              kpi.href ? (
                <a key={kpi.label} href={kpi.href} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between min-h-[110px] hover:shadow-md hover:bg-slate-50 transition-all cursor-pointer relative overflow-hidden group" style={{ borderTopColor: kpi.color, borderTopWidth: '3px' }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity" style={{ backgroundColor: kpi.color }} />
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-tight group-hover:text-slate-700 transition-colors">{kpi.label}</span>
                    <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform" style={{ color: kpi.color }}>{kpi.icon}</span>
                  </div>
                  <span className="font-mono text-[28px] font-bold text-slate-900 z-10">{kpi.value.toLocaleString()}</span>
                </a>
              ) : (
                <div key={kpi.label} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between min-h-[110px]" style={{ borderTopColor: kpi.color, borderTopWidth: '3px' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider leading-tight">{kpi.label}</span>
                    <span className="material-symbols-outlined text-[20px]" style={{ color: kpi.color }}>{kpi.icon}</span>
                  </div>
                  <span className="font-mono text-[28px] font-bold text-slate-900">{kpi.value.toLocaleString()}</span>
                </div>
              )
            ))}
          </section>

          {/* Charts Row */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* District Distribution (mini) */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 col-span-1 lg:col-span-2 flex flex-col min-h-[280px]">
              <h3 className="text-[16px] font-semibold text-slate-900 mb-3">District-wise Distribution</h3>
              <div className="flex-1 w-full h-[220px] flex items-center justify-center">
                {districtData.length === 0 ? (
                  <div className="text-center text-slate-400">
                    <span className="material-symbols-outlined text-[32px] block mb-2 opacity-50">bar_chart</span>
                    <p className="text-[13px]">No data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={districtData.slice(0, 8)}>
                      <XAxis dataKey="district" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: '#F1F5F9' }} />
                      <Bar dataKey="challan_count" fill="#1E40AF" radius={[4, 4, 0, 0]} name="Challans" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Lead Status Pie */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col min-h-[280px]">
              <h3 className="text-[16px] font-semibold text-slate-900 mb-3">Lead Status</h3>
              <div className="flex-1 w-full h-[180px] flex items-center justify-center relative">
                {leadStatusData.length === 0 ? (
                  <div className="text-center text-slate-400">
                    <span className="material-symbols-outlined text-[32px] block mb-2 opacity-50">pie_chart</span>
                    <p className="text-[13px]">No leads yet</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={leadStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="count">
                          {leadStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute text-center pointer-events-none">
                      <span className="block font-mono text-[22px] font-bold text-slate-900">{summary.total_leads}</span>
                      <span className="text-[11px] font-semibold text-slate-500">Total</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {leadStatusData.map((s, i) => (
                  <span key={s.status} className="text-[10px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || CHART_COLORS[i % CHART_COLORS.length] }} />
                    {s.status.replace('_', ' ')} ({s.count})
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ═══════════════════════ Section B: District Analysis ═══════════════════════ */}
      {activeTab === 'district' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 min-h-[300px]">
            <h3 className="text-[16px] font-semibold text-slate-900 mb-4">District-wise Distribution</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtData}>
                  <XAxis dataKey="district" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="challan_count" fill="#1E40AF" radius={[4, 4, 0, 0]} name="Challans" />
                  <Bar dataKey="lead_count" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase">District</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase text-right">Challans</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase text-right">Leads</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase text-right">Pending Follow-ups</th>
              </tr></thead>
              <tbody>
                {districtData.map((d, i) => (
                  <tr key={d.district} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="py-2.5 px-4 text-[13px] font-medium text-slate-900">{d.district}</td>
                    <td className="py-2.5 px-4 text-[13px] font-mono text-right text-slate-900">{d.challan_count}</td>
                    <td className="py-2.5 px-4 text-[13px] font-mono text-right text-slate-600">{d.lead_count}</td>
                    <td className="py-2.5 px-4 text-[13px] font-mono text-right">{d.followup_count > 0 ? <span className="text-amber-600 font-bold">{d.followup_count}</span> : <span className="text-slate-400">0</span>}</td>
                  </tr>
                ))}
                {districtData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">map</span>
                        <p className="text-[14px] font-medium text-slate-500">No district data available</p>
                        <p className="text-[12px] mt-1">Challans and leads will appear here once created.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════ Section C: Book Analysis ═══════════════════════ */}
      {activeTab === 'books' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 min-h-[300px]">
            <h3 className="text-[16px] font-semibold text-slate-900 mb-4">Most Distributed Books</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookData.slice(0, 8)} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="book_name" type="category" width={150} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="distribution_count" fill="#10B981" radius={[0, 4, 4, 0]} name="Distributed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase">Book</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase text-right">Distributed</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase text-right">Unique Leads</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase text-right">Repeat</th>
              </tr></thead>
              <tbody>
                {bookData.map((b, i) => (
                  <tr key={b.book_name} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="py-2.5 px-4 text-[13px] font-medium text-slate-900">{b.book_name}</td>
                    <td className="py-2.5 px-4 text-[13px] font-mono text-right text-slate-900">{b.distribution_count}</td>
                    <td className="py-2.5 px-4 text-[13px] font-mono text-right text-slate-600">{b.unique_leads}</td>
                    <td className="py-2.5 px-4 text-[13px] font-mono text-right">{b.repeat_count > 0 ? <span className="text-amber-600 font-bold">{b.repeat_count}</span> : <span className="text-slate-400">0</span>}</td>
                  </tr>
                ))}
                {bookData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">menu_book</span>
                        <p className="text-[14px] font-medium text-slate-500">No books distributed yet</p>
                        <p className="text-[12px] mt-1">Specimen distribution data will appear here.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════ Section D: Representative Performance ═══════════════════════ */}
      {activeTab === 'representatives' && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-[16px] font-semibold text-slate-900">Representative Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase">Representative</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase text-right">Challans</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase text-right">Leads</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase text-right">Interested</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase text-right">Follow-Ups Done</th>
                <th className="py-3 px-4 text-[12px] font-semibold text-slate-500 uppercase text-right">Score</th>
              </tr></thead>
              <tbody>
                {representativeData.map((r, i) => (
                  <tr key={r.representative_name} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                    <td className="py-3 px-4 text-[13px] font-medium text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1E40AF] flex items-center justify-center text-[10px] text-white font-bold uppercase">{r.representative_name.substring(0, 2)}</div>
                      {r.representative_name}
                    </td>
                    <td className="py-3 px-4 text-[13px] font-mono text-right text-slate-900">{r.challan_count}</td>
                    <td className="py-3 px-4 text-[13px] font-mono text-right text-slate-600">{r.lead_count}</td>
                    <td className="py-3 px-4 text-[13px] font-mono text-right text-emerald-600 font-bold">{r.interested_count}</td>
                    <td className="py-3 px-4 text-[13px] font-mono text-right text-slate-600">{r.followups_completed}</td>
                    <td className="py-3 px-4 text-right"><ScoreBar score={r.performance_score} /></td>
                  </tr>
                ))}
                {representativeData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-[48px] mb-2 opacity-50">group_off</span>
                        <p className="text-[14px] font-medium text-slate-500">No representative data yet</p>
                        <p className="text-[12px] mt-1">Performance metrics will populate automatically.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════ Section E: Follow-Up Queue ═══════════════════════ */}
      {activeTab === 'followups' && (
        <div className="space-y-6">
          {/* Overdue */}
          {followUpQueue.overdue.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 overflow-hidden">
              <div className="p-3 border-b border-red-100 bg-red-50 flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-red-500 text-[18px]">warning</span><h3 className="text-[14px] font-bold text-red-800">Overdue</h3></div>
                <span className="bg-red-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">{followUpQueue.overdue.length}</span>
              </div>
              <FollowUpTable items={followUpQueue.overdue} variant="overdue" />
            </div>
          )}
          {/* Due Today */}
          <div className="bg-white rounded-lg shadow-sm border border-amber-200 overflow-hidden">
            <div className="p-3 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-amber-600 text-[18px]">today</span><h3 className="text-[14px] font-bold text-amber-800">Due Today</h3></div>
              <span className="bg-amber-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">{followUpQueue.due_today.length}</span>
            </div>
            <FollowUpTable items={followUpQueue.due_today} variant="today" />
          </div>
          {/* Upcoming */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2"><span className="material-symbols-outlined text-blue-500 text-[18px]">upcoming</span><h3 className="text-[14px] font-bold text-slate-800">Upcoming (Next 7 Days)</h3></div>
              <span className="bg-blue-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">{followUpQueue.upcoming.length}</span>
            </div>
            <FollowUpTable items={followUpQueue.upcoming} variant="upcoming" />
          </div>
          {/* Completed */}
          {followUpQueue.completed.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-green-200 overflow-hidden">
              <div className="p-3 border-b border-green-100 bg-green-50 flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="material-symbols-outlined text-green-600 text-[18px]">task_alt</span><h3 className="text-[14px] font-bold text-green-800">Completed</h3></div>
                <span className="bg-green-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">{followUpQueue.completed.length}</span>
              </div>
              <FollowUpTable items={followUpQueue.completed} variant="upcoming" />
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ Section F: Lead Intelligence ═══════════════════════ */}
      {activeTab === 'intelligence' && (
        <div className="space-y-6">
          {/* Lead Categories */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Hot Leads', count: leadIntelligence.leadCategories.hot, color: '#EF4444', bg: 'bg-red-50', border: 'border-red-200', icon: 'local_fire_department', desc: '3+ visits & interested' },
              { label: 'Warm Leads', count: leadIntelligence.leadCategories.warm, color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-200', icon: 'wb_sunny', desc: '2+ visits or interested' },
              { label: 'Cold Leads', count: leadIntelligence.leadCategories.cold, color: '#6B7280', bg: 'bg-slate-50', border: 'border-slate-200', icon: 'ac_unit', desc: 'New / minimal contact' },
            ].map(cat => (
              <div key={cat.label} className={`${cat.bg} p-4 rounded-lg border ${cat.border} flex flex-col`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[20px]" style={{ color: cat.color }}>{cat.icon}</span>
                  <span className="text-[12px] font-semibold text-slate-700">{cat.label}</span>
                </div>
                <span className="font-mono text-[28px] font-bold" style={{ color: cat.color }}>{cat.count}</span>
                <span className="text-[10px] text-slate-500 mt-1">{cat.desc}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Institutions */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-200 bg-slate-50"><h3 className="text-[14px] font-semibold text-slate-900">Most Visited Institutions</h3></div>
              <table className="w-full text-left border-collapse">
                <thead><tr className="border-b border-slate-100"><th className="py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase">Institution</th><th className="py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase">District</th><th className="py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase text-right">Visits</th></tr></thead>
                <tbody>
                  {leadIntelligence.topInstitutions.map((inst, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-3 text-[12px] font-medium text-slate-900">{inst.name}</td>
                      <td className="py-2 px-3 text-[12px] text-slate-500">{inst.district}</td>
                      <td className="py-2 px-3 text-[12px] font-mono text-right font-bold text-[#1E40AF]">{inst.count}</td>
                    </tr>
                  ))}
                  {leadIntelligence.topInstitutions.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-slate-500 text-sm">No data yet</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Top Teachers/Shopkeepers */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-200 bg-slate-50"><h3 className="text-[14px] font-semibold text-slate-900">Most Visited Teachers / Shopkeepers</h3></div>
              <table className="w-full text-left border-collapse">
                <thead><tr className="border-b border-slate-100"><th className="py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase">Name</th><th className="py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase">District</th><th className="py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase text-right">Visits</th></tr></thead>
                <tbody>
                  {leadIntelligence.topTeachers.map((t, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-3 text-[12px] font-medium text-slate-900">{t.name}</td>
                      <td className="py-2 px-3 text-[12px] text-slate-500">{t.district}</td>
                      <td className="py-2 px-3 text-[12px] font-mono text-right font-bold text-[#1E40AF]">{t.count}</td>
                    </tr>
                  ))}
                  {leadIntelligence.topTeachers.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-slate-500 text-sm">No data yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Follow-Up Queue Table ──
function FollowUpTable({ items, variant }: { items: FollowUpItem[]; variant: 'overdue' | 'today' | 'upcoming' }) {
  if (items.length === 0) {
    return <div className="py-6 text-center text-slate-500 text-sm">{variant === 'today' ? 'No follow-ups due today' : variant === 'overdue' ? 'No overdue follow-ups' : 'No upcoming follow-ups'}</div>;
  }
  return (
    <table className="w-full text-left border-collapse">
      <thead><tr className="border-b border-slate-100">
        <th className="py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase">Contact</th>
        <th className="py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase">Institute</th>
        <th className="py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase">District</th>
        <th className="py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase">Due Date</th>
        <th className="py-2 px-3 text-[11px] font-semibold text-slate-500 uppercase text-right">Phone</th>
      </tr></thead>
      <tbody>
        {items.map(item => {
          const lead = item.lead as FollowUpLead;
          return (
            <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              <td className="py-2 px-3 text-[12px] font-medium text-slate-900">{lead?.contact_person || '-'}</td>
              <td className="py-2 px-3 text-[12px] text-slate-600">{lead?.institute_name || '-'}</td>
              <td className="py-2 px-3 text-[12px] text-slate-500">{lead?.district || '-'}</td>
              <td className="py-2 px-3 text-[12px] font-mono">
                <span className={variant === 'overdue' ? 'text-red-600 font-bold' : variant === 'today' ? 'text-amber-600 font-bold' : 'text-slate-600'}>
                  {item.followup_date}
                </span>
              </td>
              <td className="py-2 px-3 text-[12px] font-mono text-right text-slate-500">{lead?.mobile_no || '-'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

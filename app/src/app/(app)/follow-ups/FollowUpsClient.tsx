'use client';

import { useState } from 'react';
import { FOLLOWUP_STATUS_COLORS } from '@/lib/types';

// ── Types ──
interface FollowUpLead {
  id: string;
  lead_id: string;
  contact_person: string;
  institute_name: string;
  district: string;
  mobile_no: string;
  status: string;
  village_town: string | null;
}

interface FollowUpItem {
  id: string;
  lead_id: string;
  challan_no: string | null;
  followup_date: string;
  status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  lead: FollowUpLead;
}

interface FollowUpData {
  dueToday: FollowUpItem[];
  overdue: FollowUpItem[];
  upcoming: FollowUpItem[];
  completed: FollowUpItem[];
}

type TabId = 'overdue' | 'due_today' | 'upcoming' | 'completed';

const TABS: { id: TabId; label: string; icon: string; emptyText: string }[] = [
  { id: 'overdue', label: 'Overdue', icon: 'warning', emptyText: 'No overdue follow-ups — great job!' },
  { id: 'due_today', label: 'Due Today', icon: 'today', emptyText: 'No follow-ups due today' },
  { id: 'upcoming', label: 'Upcoming', icon: 'upcoming', emptyText: 'No upcoming follow-ups in the next 14 days' },
  { id: 'completed', label: 'Completed', icon: 'task_alt', emptyText: 'No completed follow-ups yet' },
];

const TAB_STYLES: Record<TabId, { headerBg: string; headerBorder: string; headerText: string; badge: string; badgeText: string }> = {
  overdue: { headerBg: 'bg-red-50', headerBorder: 'border-red-200', headerText: 'text-red-800', badge: 'bg-red-500', badgeText: 'text-white' },
  due_today: { headerBg: 'bg-amber-50', headerBorder: 'border-amber-200', headerText: 'text-amber-800', badge: 'bg-amber-500', badgeText: 'text-white' },
  upcoming: { headerBg: 'bg-blue-50', headerBorder: 'border-blue-200', headerText: 'text-blue-800', badge: 'bg-blue-500', badgeText: 'text-white' },
  completed: { headerBg: 'bg-green-50', headerBorder: 'border-green-200', headerText: 'text-green-800', badge: 'bg-green-500', badgeText: 'text-white' },
};

// ── Reschedule Modal ──
function RescheduleModal({
  followUp,
  onSave,
  onCancel,
  loading,
}: {
  followUp: FollowUpItem;
  onSave: (newDate: string, remarks: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [newDate, setNewDate] = useState('');
  const [remarks, setRemarks] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-blue-600 text-[28px]">event_repeat</span>
          <div>
            <h3 className="text-[16px] font-bold text-blue-900">Reschedule Follow-Up</h3>
            <p className="text-[12px] text-blue-700 mt-0.5">{followUp.lead?.contact_person} — {followUp.lead?.institute_name}</p>
          </div>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="text-[12px] font-semibold text-slate-600 mb-1 block">Current Date</label>
            <p className="font-mono text-[13px] text-slate-500">{followUp.followup_date}</p>
          </div>
          <div>
            <label className="text-[12px] font-semibold text-slate-600 mb-1 block">New Follow-Up Date *</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-slate-600 mb-1 block">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Reason for rescheduling..."
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[12px] text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-[13px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(newDate, remarks)}
            disabled={!newDate || loading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-[13px] font-bold hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">event_repeat</span>
            {loading ? 'Saving...' : 'Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function FollowUpsClient({ data }: { data: FollowUpData }) {
  // Default to overdue tab if there are overdue items, otherwise due_today
  const defaultTab: TabId = data.overdue.length > 0 ? 'overdue' : 'due_today';
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [followUps, setFollowUps] = useState<FollowUpData>(data);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<FollowUpItem | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleMarkComplete = async (item: FollowUpItem) => {
    setActionLoading(item.id);
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          lead_id: item.lead_id,
          status: 'completed',
        }),
      });
      if (!res.ok) throw new Error('Failed to update');

      // Move item from current list to completed
      setFollowUps(prev => {
        const updatedItem = { ...item, status: 'completed', updated_at: new Date().toISOString() };
        return {
          dueToday: prev.dueToday.filter(f => f.id !== item.id),
          overdue: prev.overdue.filter(f => f.id !== item.id),
          upcoming: prev.upcoming.filter(f => f.id !== item.id),
          completed: [updatedItem, ...prev.completed],
        };
      });
      showNotification('success', `Follow-up for ${item.lead?.contact_person} marked complete`);
    } catch {
      showNotification('error', 'Failed to update follow-up');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReschedule = async (newDate: string, remarks: string) => {
    if (!rescheduleTarget) return;
    setActionLoading(rescheduleTarget.id);
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rescheduleTarget.id,
          lead_id: rescheduleTarget.lead_id,
          status: 'rescheduled',
          followup_date: newDate,
          remarks: remarks || rescheduleTarget.remarks,
        }),
      });
      if (!res.ok) throw new Error('Failed to reschedule');

      // Remove from old list, add to upcoming
      const updatedItem = { ...rescheduleTarget, followup_date: newDate, status: 'pending', remarks: remarks || rescheduleTarget.remarks };
      setFollowUps(prev => ({
        dueToday: prev.dueToday.filter(f => f.id !== rescheduleTarget.id),
        overdue: prev.overdue.filter(f => f.id !== rescheduleTarget.id),
        upcoming: [...prev.upcoming.filter(f => f.id !== rescheduleTarget.id), updatedItem].sort(
          (a, b) => a.followup_date.localeCompare(b.followup_date)
        ),
        completed: prev.completed,
      }));
      showNotification('success', `Follow-up rescheduled to ${newDate}`);
      setRescheduleTarget(null);
    } catch {
      showNotification('error', 'Failed to reschedule follow-up');
    } finally {
      setActionLoading(null);
    }
  };

  const getItemsForTab = (tab: TabId): FollowUpItem[] => {
    switch (tab) {
      case 'overdue': return followUps.overdue;
      case 'due_today': return followUps.dueToday;
      case 'upcoming': return followUps.upcoming;
      case 'completed': return followUps.completed;
    }
  };

  const getCountForTab = (tab: TabId): number => getItemsForTab(tab).length;

  const totalPending = followUps.dueToday.length + followUps.overdue.length + followUps.upcoming.length;

  const items = getItemsForTab(activeTab);
  const tabInfo = TABS.find(t => t.id === activeTab)!;
  const tabStyle = TAB_STYLES[activeTab];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDaysLabel = (dateStr: string) => {
    const diff = Math.floor((new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff < 0) return `${Math.abs(diff)} days ago`;
    return `In ${diff} days`;
  };

  return (
    <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6 w-full max-w-[1200px] mx-auto">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border flex items-center gap-2 text-[13px] font-medium animate-[slideIn_0.3s_ease-out] ${
          notification.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {notification.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {notification.message}
        </div>
      )}

      {/* Page Header */}
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h2 className="text-[28px] md:text-[32px] font-bold text-slate-900 tracking-tight">Follow-Ups</h2>
            <hr className="border-0 h-[2px] bg-[#1E40AF] w-[120px] mt-1" />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
              <span className="material-symbols-outlined text-amber-500 text-[18px]">pending_actions</span>
              <span className="text-[12px] font-semibold text-slate-500">Pending:</span>
              <span className="font-mono text-[16px] font-bold text-slate-900">{totalPending}</span>
            </div>
            {followUps.overdue.length > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-red-500 text-[18px]">warning</span>
                <span className="text-[12px] font-bold text-red-700">{followUps.overdue.length} Overdue</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(tab => {
          const count = getCountForTab(tab.id);
          const style = TAB_STYLES[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? `${style.headerBg} ${style.headerText} border ${style.headerBorder} shadow-sm`
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                  activeTab === tab.id ? `${style.badge} ${style.badgeText}` : 'bg-slate-200 text-slate-600'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className={`p-4 border-b ${tabStyle.headerBorder} ${tabStyle.headerBg} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-[20px] ${tabStyle.headerText}`}>{tabInfo.icon}</span>
            <h3 className={`text-[16px] font-bold ${tabStyle.headerText}`}>{tabInfo.label}</h3>
          </div>
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${tabStyle.badge} ${tabStyle.badgeText}`}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Table or Empty State */}
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-[40px] text-slate-300 mb-2 block">{tabInfo.icon}</span>
            <p className="text-[14px] text-slate-500">{tabInfo.emptyText}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Institute</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">District</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                  {activeTab !== 'completed' && (
                    <th className="py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const lead = item.lead as FollowUpLead;
                  const isLoading = actionLoading === item.id;
                  const statusColors = FOLLOWUP_STATUS_COLORS[item.status as keyof typeof FOLLOWUP_STATUS_COLORS] || FOLLOWUP_STATUS_COLORS.pending;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <div className="text-[13px] font-semibold text-slate-900">{lead?.contact_person || '-'}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{lead?.lead_id || ''}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[13px] text-slate-700">{lead?.institute_name || '-'}</div>
                        {lead?.village_town && <div className="text-[11px] text-slate-400 mt-0.5">{lead.village_town}</div>}
                      </td>
                      <td className="py-3 px-4 text-[13px] text-slate-600">{lead?.district || '-'}</td>
                      <td className="py-3 px-4">
                        <div className={`text-[13px] font-mono font-bold ${
                          activeTab === 'overdue' ? 'text-red-600' : activeTab === 'due_today' ? 'text-amber-600' : 'text-slate-700'
                        }`}>
                          {formatDate(item.followup_date)}
                        </div>
                        <div className={`text-[10px] mt-0.5 ${
                          activeTab === 'overdue' ? 'text-red-400' : 'text-slate-400'
                        }`}>
                          {getDaysLabel(item.followup_date)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <a href={`tel:${lead?.mobile_no}`} className="font-mono text-[12px] text-[#1E40AF] hover:underline flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">call</span>
                          {lead?.mobile_no || '-'}
                        </a>
                      </td>
                      {activeTab !== 'completed' && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleMarkComplete(item)}
                              disabled={isLoading}
                              className="p-1.5 rounded-md bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                              title="Mark Complete"
                            >
                              <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            </button>
                            <button
                              onClick={() => setRescheduleTarget(item)}
                              disabled={isLoading}
                              className="p-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                              title="Reschedule"
                            >
                              <span className="material-symbols-outlined text-[16px]">event_repeat</span>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remarks legend for items with remarks */}
      {items.some(i => i.remarks) && activeTab !== 'completed' && (
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</h4>
          <div className="space-y-1">
            {items.filter(i => i.remarks).map(item => (
              <div key={item.id} className="flex items-start gap-2">
                <span className="font-mono text-[11px] text-slate-400 mt-0.5">{item.lead?.contact_person}:</span>
                <span className="text-[12px] text-slate-600">{item.remarks}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <RescheduleModal
          followUp={rescheduleTarget}
          onSave={handleReschedule}
          onCancel={() => setRescheduleTarget(null)}
          loading={actionLoading === rescheduleTarget.id}
        />
      )}
    </div>
  );
}

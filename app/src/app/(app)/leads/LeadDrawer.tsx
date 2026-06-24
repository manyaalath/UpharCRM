'use client';

import { Lead, LEAD_STATUS_COLORS, LEAD_STATUS_OPTIONS, LeadActivity, CallFeedback, CALL_OUTCOME_OPTIONS, CallOutcome } from '@/lib/types';
import { useEffect, useRef, useState } from 'react';

const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  lead_created: { icon: 'person_add', color: '#6366F1' },
  specimen_distributed: { icon: 'menu_book', color: '#10B981' },
  additional_specimen: { icon: 'library_add', color: '#10B981' },
  challan_attached: { icon: 'link', color: '#3B82F6' },
  followup_created: { icon: 'event', color: '#F59E0B' },
  call_completed: { icon: 'call', color: '#8B5CF6' },
  suggestion_received: { icon: 'lightbulb', color: '#F59E0B' },
  complaint_received: { icon: 'report', color: '#EF4444' },
  status_changed: { icon: 'sync', color: '#6B7280' },
};

export default function LeadDrawer({ lead, onClose }: { lead: Lead | null, onClose: () => void }) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<'timeline' | 'feedback'>('timeline');
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<CallFeedback[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Call feedback form state
  const [callOutcome, setCallOutcome] = useState<CallOutcome | ''>('');
  const [suggestions, setSuggestions] = useState('');
  const [complaints, setComplaints] = useState('');
  const [feedbackRemarks, setFeedbackRemarks] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Fetch activities and feedback when lead changes
  useEffect(() => {
    if (lead) {
      fetchActivities(lead.id);
      fetchFeedback(lead.id);
    }
  }, [lead]);

  const fetchActivities = async (leadId: string) => {
    setLoadingActivities(true);
    try {
      const res = await fetch(`/api/lead-activities?lead_id=${leadId}`);
      const data = await res.json();
      if (data.data) setActivities(data.data);
    } catch { /* ignore */ }
    finally { setLoadingActivities(false); }
  };

  const fetchFeedback = async (leadId: string) => {
    try {
      const res = await fetch(`/api/call-feedback?lead_id=${leadId}`);
      const data = await res.json();
      if (data.data) setFeedbackHistory(data.data);
    } catch { /* ignore */ }
  };

  const handleSubmitFeedback = async () => {
    if (!lead || !callOutcome) return;
    setSubmittingFeedback(true);
    setFeedbackSuccess(false);
    try {
      const res = await fetch('/api/call-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          call_outcome: callOutcome,
          suggestions: suggestions || null,
          complaints: complaints || null,
          remarks: feedbackRemarks || null,
        }),
      });
      if (res.ok) {
        setFeedbackSuccess(true);
        setCallOutcome('');
        setSuggestions('');
        setComplaints('');
        setFeedbackRemarks('');
        fetchActivities(lead.id);
        fetchFeedback(lead.id);
        setTimeout(() => setFeedbackSuccess(false), 3000);
      }
    } catch { /* ignore */ }
    finally { setSubmittingFeedback(false); }
  };

  if (!lead) return null;

  const colors = LEAD_STATUS_COLORS[lead.status] || LEAD_STATUS_COLORS.new;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 transition-opacity" onClick={onClose} />
      
      {/* Drawer */}
      <div 
        ref={drawerRef}
        className="fixed inset-y-0 right-0 w-full md:w-[440px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col"
      >
        {/* Drawer Header */}
        <div className="px-5 py-3 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0">
          <div>
            <h2 className="text-[18px] font-semibold text-[#1E40AF] m-0">Lead Details</h2>
            <hr className="w-8 h-[2px] bg-[#1E40AF] border-none mt-1" />
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 p-1 rounded-full hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Drawer Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
          
          {/* Quick Info Card */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 relative">
            <div className="absolute top-4 right-4">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                {LEAD_STATUS_OPTIONS.find(o => o.value === lead.status)?.label || lead.status}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <span className="material-symbols-outlined text-slate-500 text-[20px]">person</span>
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-slate-900">{lead.contact_person}</h3>
                <p className="text-[12px] text-slate-500">{lead.institute_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
              <div>
                <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wide">Phone</span>
                <span className="font-mono text-[13px] text-slate-900">{lead.mobile_no}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wide">District</span>
                <span className="text-[13px] text-slate-900">{lead.district}</span>
              </div>
              {lead.village_town && (
                <div>
                  <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wide">Village/Town</span>
                  <span className="text-[13px] text-slate-900">{lead.village_town}</span>
                </div>
              )}
              {lead.locality && (
                <div>
                  <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wide">Locality</span>
                  <span className="text-[13px] text-slate-900">{lead.locality}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
            <button
              onClick={() => setActiveSection('timeline')}
              className={`flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${activeSection === 'timeline' ? 'bg-[#1E40AF] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Activity Timeline
            </button>
            <button
              onClick={() => setActiveSection('feedback')}
              className={`flex-1 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${activeSection === 'feedback' ? 'bg-[#1E40AF] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Call Feedback
            </button>
          </div>

          {/* Activity Timeline */}
          {activeSection === 'timeline' && (
            <div>
              <h4 className="text-[12px] font-semibold text-[#1E40AF] uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">
                Activity History
              </h4>
              {loadingActivities ? (
                <div className="py-6 text-center text-slate-500 text-[12px]">Loading...</div>
              ) : activities.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-[12px]">No activities recorded yet</div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[11px] before:h-full before:w-0.5 before:bg-slate-200">
                  {activities.map(activity => {
                    const iconInfo = ACTIVITY_ICONS[activity.activity_type] || { icon: 'circle', color: '#6B7280' };
                    return (
                      <div key={activity.id} className="relative flex items-start gap-3 pl-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center z-10 bg-white border-2" style={{ borderColor: iconInfo.color }}>
                          <span className="material-symbols-outlined text-[12px]" style={{ color: iconInfo.color }}>{iconInfo.icon}</span>
                        </div>
                        <div className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 shadow-sm">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="text-[12px] font-semibold text-slate-900">{activity.activity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            <span className="font-mono text-[10px] text-slate-400">{new Date(activity.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{activity.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Call Feedback Section */}
          {activeSection === 'feedback' && (
            <div className="space-y-4">
              {/* Log New Feedback */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <h4 className="text-[12px] font-semibold text-slate-900 uppercase tracking-wider mb-3">Log Call Feedback</h4>
                
                {feedbackSuccess && (
                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-[12px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span> Feedback saved!
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Call Outcome *</label>
                    <select
                      value={callOutcome}
                      onChange={(e) => setCallOutcome(e.target.value as CallOutcome)}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                    >
                      <option value="">Select outcome</option>
                      {CALL_OUTCOME_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Suggestions</label>
                    <textarea value={suggestions} onChange={e => setSuggestions(e.target.value)} rows={2} placeholder="Any suggestions from contact..." className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[12px] text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#1E40AF]" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Complaints</label>
                    <textarea value={complaints} onChange={e => setComplaints(e.target.value)} rows={2} placeholder="Any complaints..." className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[12px] text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#1E40AF]" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Remarks</label>
                    <textarea value={feedbackRemarks} onChange={e => setFeedbackRemarks(e.target.value)} rows={2} placeholder="Additional notes..." className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[12px] text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#1E40AF]" />
                  </div>
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={!callOutcome || submittingFeedback}
                    className="w-full py-2 bg-[#1E40AF] text-white rounded text-[12px] font-bold hover:bg-[#1E3A8A] transition-colors disabled:opacity-50"
                  >
                    {submittingFeedback ? 'Saving...' : 'Save Feedback'}
                  </button>
                </div>
              </div>

              {/* Feedback History */}
              {feedbackHistory.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-semibold text-slate-900 uppercase tracking-wider mb-2">Previous Feedback</h4>
                  <div className="space-y-2">
                    {feedbackHistory.map(fb => (
                      <div key={fb.id} className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[12px] font-bold text-slate-900 capitalize">{fb.call_outcome.replace(/_/g, ' ')}</span>
                          <span className="font-mono text-[10px] text-slate-400">{new Date(fb.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        {fb.suggestions && <p className="text-[11px] text-slate-500"><strong>Suggestion:</strong> {fb.suggestions}</p>}
                        {fb.complaints && <p className="text-[11px] text-red-500"><strong>Complaint:</strong> {fb.complaints}</p>}
                        {fb.remarks && <p className="text-[11px] text-slate-500"><strong>Remarks:</strong> {fb.remarks}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-3 border-t border-slate-200 bg-white sticky bottom-0 flex gap-2">
          <button className="flex-1 py-2 px-3 bg-white border border-slate-200 rounded-md text-slate-900 hover:bg-slate-50 transition-colors text-[12px] font-semibold">
            Edit Lead
          </button>
          <button
            onClick={() => setActiveSection('feedback')}
            className="flex-1 py-2 px-3 bg-[#1E40AF] rounded-md text-white hover:bg-[#1E3A8A] transition-colors text-[12px] font-semibold shadow-md"
          >
            Log Call
          </button>
        </div>
      </div>
    </>
  );
}

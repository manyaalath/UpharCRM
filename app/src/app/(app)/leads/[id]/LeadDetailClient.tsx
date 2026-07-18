'use client';

import { Lead, LEAD_STATUS_COLORS, LEAD_STATUS_OPTIONS, LeadActivity, CallFeedback, CALL_OUTCOME_OPTIONS, CallOutcome } from '@/lib/types';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import LeadAiSummary from './LeadAiSummary';
// import LeadWhatsApp from './LeadWhatsApp'; // parked — see WHATSAPP_INTEGRATION.md

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
  whatsapp_sent: { icon: 'chat', color: '#25D366' },
  whatsapp_reply: { icon: 'reply', color: '#059669' },
  whatsapp_no_response: { icon: 'timer', color: '#F59E0B' },
};

interface LeadBook {
  id: string;
  title: string;
  total_quantity: number;
  challans: { challan_no: string; challan_date: string; quantity: number }[];
}

export default function LeadDetailClient({ lead }: { lead: any }) {
  const [activeSection, setActiveSection] = useState<'timeline' | 'feedback'>('timeline');
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<CallFeedback[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [leadBooks, setLeadBooks] = useState<LeadBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);

  // Call feedback form state
  const [callOutcome, setCallOutcome] = useState<CallOutcome | ''>('');
  const [suggestions, setSuggestions] = useState('');
  const [complaints, setComplaints] = useState('');
  const [feedbackRemarks, setFeedbackRemarks] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  useEffect(() => {
    if (lead) {
      fetchActivities(lead.id);
      fetchFeedback(lead.id);
      fetchBooks(lead.id);
    }
  }, [lead]);

  const fetchBooks = async (leadId: string) => {
    setLoadingBooks(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/books`);
      const data = await res.json();
      if (data.data) setLeadBooks(data.data);
    } catch { /* ignore */ }
    finally { setLoadingBooks(false); }
  };

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

  const colors = LEAD_STATUS_COLORS[lead.status as keyof typeof LEAD_STATUS_COLORS] || LEAD_STATUS_COLORS.new;

  const instContact = Array.isArray(lead.institute_contacts) ? lead.institute_contacts[0] : lead.institute_contacts;
  const contact_person = instContact?.contacts?.name || 'Unknown';
  const mobile_no = instContact?.contacts?.mobile_no || 'Unknown';
  const institute_name = instContact?.institutes?.name || 'Unknown';
  const district = instContact?.institutes?.locations?.district || 'Unknown';
  const village_town = instContact?.institutes?.village_town;
  const locality = instContact?.institutes?.locality;

  return (
    <div className="p-6 max-w-5xl mx-auto w-full flex flex-col min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/leads" className="flex items-center text-slate-500 hover:text-slate-900 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-[28px] md:text-[32px] font-bold text-slate-900 tracking-tight">Lead: {contact_person}</h1>
            <hr className="border-0 h-[2px] bg-[#1E40AF] w-full max-w-[100px] mt-1" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Quick Info & Actions */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5 relative">
            <div className="absolute top-5 right-5">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[12px] font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                {LEAD_STATUS_OPTIONS.find(o => o.value === lead.status)?.label || lead.status}
              </span>
            </div>
            
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <span className="material-symbols-outlined text-slate-500 text-[24px]">person</span>
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-slate-900">{contact_person}</h3>
                <p className="text-[14px] text-slate-500">{institute_name}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-slate-400 text-[18px] mt-0.5">call</span>
                <div>
                  <p className="text-[12px] text-slate-500 font-semibold mb-0.5">Mobile</p>
                  <a href={`tel:${mobile_no}`} className="text-[14px] text-slate-900 font-medium hover:text-[#1E40AF]">{mobile_no}</a>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-slate-400 text-[18px] mt-0.5">location_on</span>
                <div>
                  <p className="text-[12px] text-slate-500 font-semibold mb-0.5">Location</p>
                  <p className="text-[14px] text-slate-900">{[locality, village_town, district].filter(Boolean).join(', ')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Books Distributed */}
          {loadingBooks ? (
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
              <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
            </div>
          ) : leadBooks.length > 0 && (
            <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-5">
              <h4 className="text-[13px] font-bold text-[#1E40AF] uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">menu_book</span>
                Books Distributed ({leadBooks.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {leadBooks.map(book => (
                  <div
                    key={book.id}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#DBEAFE] text-[#1E40AF] rounded-lg text-[13px] font-semibold border border-[#93C5FD] hover:bg-[#BFDBFE] transition-colors cursor-default"
                    title={book.challans.map(c => `Challan ${c.challan_no} (${c.challan_date}): qty ${c.quantity}`).join('\n')}
                  >
                    <span className="material-symbols-outlined text-[16px]">book</span>
                    {book.title}
                    <span className="bg-[#1E40AF] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[22px] text-center">
                      ×{book.total_quantity}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">Hover over a book to see challan details</p>
            </div>
          )}

          {/* WhatsApp workflow — parked until Meta integration is live, see WHATSAPP_INTEGRATION.md.
              Re-enable: uncomment the line below (and flip WHATSAPP_ENABLED=true in .env). */}
          {/* <LeadWhatsApp leadId={lead.id} onChange={() => fetchActivities(lead.id)} /> */}
        </div>

        {/* Right Column: Tabs (Timeline / Feedback) */}
        <div className="md:col-span-2 flex flex-col space-y-6">
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm w-full md:w-max">
            <button 
              onClick={() => setActiveSection('timeline')}
              className={`flex-1 md:flex-none px-6 py-2 text-[13px] font-semibold rounded-md transition-colors ${activeSection === 'timeline' ? 'bg-[#1E40AF] text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Activity Timeline
            </button>
            <button 
              onClick={() => setActiveSection('feedback')}
              className={`flex-1 md:flex-none px-6 py-2 text-[13px] font-semibold rounded-md transition-colors ${activeSection === 'feedback' ? 'bg-[#1E40AF] text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Call & Feedback
            </button>
          </div>

          {/* AI Summary Section */}
          <LeadAiSummary leadId={lead.id} />

          {/* Timeline Section */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg flex-1 overflow-hidden">
            {activeSection === 'timeline' ? (
              <div className="p-6">
                {loadingActivities ? (
                  <div className="flex items-center justify-center h-40 text-slate-400">
                    <span className="material-symbols-outlined animate-spin mr-2">refresh</span> Loading timeline...
                  </div>
                ) : activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <span className="material-symbols-outlined text-[32px] mb-2">history</span>
                    <p className="text-[13px]">No activities recorded yet.</p>
                  </div>
                ) : (
                  <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6">
                    {activities.map((act) => {
                      const iconConfig = ACTIVITY_ICONS[act.activity_type] || { icon: 'info', color: '#94A3B8' };
                      const isSystem = act.activity_type === 'lead_created' || act.activity_type === 'followup_created';
                      return (
                        <div key={act.id} className="relative">
                          <span 
                            className="absolute -left-[37px] w-6 h-6 rounded-full flex items-center justify-center text-white border-2 border-white shadow-sm"
                            style={{ backgroundColor: iconConfig.color }}
                          >
                            <span className="material-symbols-outlined text-[12px]">{iconConfig.icon}</span>
                          </span>
                          <div className={`p-3 rounded-lg border ${isSystem ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: iconConfig.color }}>
                                {act.activity_type.replace('_', ' ')}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {new Date(act.created_at || new Date().toISOString()).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className={`text-[13px] ${isSystem ? 'text-slate-600' : 'text-slate-900'}`}>
                              {act.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Feedback Form */}
                <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                  <h4 className="text-[14px] font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#1E40AF]">add_call</span>
                    Log Call Outcome
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Outcome *</label>
                      <select 
                        value={callOutcome} 
                        onChange={e => setCallOutcome(e.target.value as CallOutcome)}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                      >
                        <option value="">Select Outcome</option>
                        {CALL_OUTCOME_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    {(callOutcome === 'interested' || callOutcome === 'call_back_later') && (
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Suggestions / Requested Books</label>
                          <textarea 
                            value={suggestions}
                            onChange={e => setSuggestions(e.target.value)}
                            placeholder="Did they ask for any specific books or changes?"
                            className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[13px] text-slate-900 min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Complaints (if any)</label>
                      <textarea 
                        value={complaints}
                        onChange={e => setComplaints(e.target.value)}
                        placeholder="What went wrong?"
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[13px] text-slate-900 min-h-[60px] focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">General Remarks</label>
                      <textarea 
                        value={feedbackRemarks}
                        onChange={e => setFeedbackRemarks(e.target.value)}
                        placeholder="Additional notes..."
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-[13px] text-slate-900 min-h-[60px] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button 
                        onClick={handleSubmitFeedback}
                        disabled={!callOutcome || submittingFeedback}
                        className="px-4 py-2 bg-[#1E40AF] text-white rounded text-[12px] font-bold shadow-sm hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {submittingFeedback ? 'Saving...' : 'Save Feedback'}
                        {feedbackSuccess && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Feedback History */}
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">Past Call Logs</h4>
                  {feedbackHistory.length === 0 ? (
                    <p className="text-[13px] text-slate-400 italic">No past call logs found.</p>
                  ) : (
                    <div className="space-y-3">
                      {feedbackHistory.map(fb => (
                        <div key={fb.id} className="bg-white border border-slate-200 rounded p-3 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[12px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {CALL_OUTCOME_OPTIONS.find(o => o.value === fb.call_outcome)?.label || fb.call_outcome}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(fb.created_at || new Date().toISOString()).toLocaleDateString('en-GB')}
                            </span>
                          </div>
                          {fb.remarks && <p className="text-[13px] text-slate-800 mb-1">{fb.remarks}</p>}
                          {fb.suggestions && <p className="text-[12px] text-amber-700 bg-amber-50 p-2 rounded mt-2 border border-amber-100"><span className="font-bold">Suggestion:</span> {fb.suggestions}</p>}
                          {fb.complaints && <p className="text-[12px] text-red-700 bg-red-50 p-2 rounded mt-2 border border-red-100"><span className="font-bold">Complaint:</span> {fb.complaints}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

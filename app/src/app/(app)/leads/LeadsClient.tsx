'use client';

import { useState, useEffect, useCallback } from 'react';
import LeadDrawer from './LeadDrawer';
import { LEAD_STATUS_COLORS, LEAD_STATUS_OPTIONS, Lead } from '@/lib/types';
import { ALL_DISTRICTS } from '@/lib/constants';

export default function LeadsClient({ initialData, totalCount, agents }: { initialData: Lead[], totalCount: number, agents: string[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialData);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [district, setDistrict] = useState('');
  const [agentName, setAgentName] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(totalCount);
  const limit = 20;

  const fetchLeads = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    if (district) params.append('district', district);
    if (agentName) params.append('agent_name', agentName);
    if (dateStart) params.append('date_start', dateStart);
    if (dateEnd) params.append('date_end', dateEnd);
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    try {
      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setLeads(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    }
  }, [search, status, district, agentName, dateStart, dateEnd, page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleExport = async () => {
    // Build export URL with current filters
    const params = new URLSearchParams();
    params.append('type', 'leads');
    if (district) params.append('district', district);
    if (agentName) params.append('agent_name', agentName);
    if (dateStart) params.append('date_start', dateStart);
    if (dateEnd) params.append('date_end', dateEnd);

    try {
      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Export failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed');
    }
  };

  const canExport = true;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto w-full flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative">
          <h1 className="text-[32px] font-bold text-[#1E40AF] mb-2 leading-tight">All Leads</h1>
          <hr className="w-16 h-[2px] bg-[#1E40AF] border-none absolute -bottom-1 left-0" />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {canExport && (
            <button onClick={handleExport} className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-md text-slate-900 hover:bg-slate-50 transition-colors text-[13px] font-semibold w-full sm:w-auto shadow-sm">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export
            </button>
          )}
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-sm flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[13px] font-semibold text-slate-500 mb-1">Search Leads</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input 
                type="text" 
                placeholder="Name, Institute, Phone, Rep..." 
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-md py-2 pl-10 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] text-[14px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-500 mb-1">Status</label>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="w-full bg-white border border-slate-200 rounded-md py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] text-[14px] outline-none appearance-none">
              <option value="">All Statuses</option>
              {LEAD_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-500 mb-1">District</label>
            <select value={district} onChange={e => { setDistrict(e.target.value); setPage(1); }} className="w-full bg-white border border-slate-200 rounded-md py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] text-[14px] outline-none appearance-none">
              <option value="">All Districts</option>
              {ALL_DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-500 mb-1">Representative</label>
            <select value={agentName} onChange={e => { setAgentName(e.target.value); setPage(1); }} className="w-full bg-white border border-slate-200 rounded-md py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] text-[14px] outline-none appearance-none">
              <option value="">All Reps</option>
              {agents.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 col-span-2 md:col-span-1">
             <label className="block text-[13px] font-semibold text-slate-500 mb-1">Date Range</label>
             <div className="flex gap-2">
               <input type="date" value={dateStart} onChange={e => { setDateStart(e.target.value); setPage(1); }} className="w-full bg-white border border-slate-200 rounded-md p-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]" />
               <input type="date" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setPage(1); }} className="w-full bg-white border border-slate-200 rounded-md p-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]" />
             </div>
          </div>
        </div>
      </div>

      {/* Leads Table Card */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
              <tr>
                <th className="py-3 px-4 text-[13px] font-semibold uppercase tracking-wider text-slate-500">Contact</th>
                <th className="py-3 px-4 text-[13px] font-semibold uppercase tracking-wider text-slate-500">Institute</th>
                <th className="py-3 px-4 text-[13px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                <th className="py-3 px-4 text-[13px] font-semibold uppercase tracking-wider text-slate-500">Next Due</th>
                <th className="py-3 px-4 text-[13px] font-semibold uppercase tracking-wider text-slate-500">Representative</th>
                <th className="py-3 px-4 text-[13px] font-semibold uppercase tracking-wider text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 overflow-y-auto">
              {leads.map((lead: any) => {
                const colors = LEAD_STATUS_COLORS[lead.status as keyof typeof LEAD_STATUS_COLORS] || LEAD_STATUS_COLORS.new;
                const instContact = Array.isArray(lead.institute_contacts) ? lead.institute_contacts[0] : lead.institute_contacts;
                const contact_person = instContact?.contacts?.name || 'Unknown';
                const mobile_no = instContact?.contacts?.mobile_no || 'Unknown';
                const institute_name = instContact?.institutes?.name || 'Unknown';
                const district = instContact?.institutes?.locations?.district || 'Unknown';
                const agent_name = lead.agents?.name || 'Unassigned';

                return (
                  <tr 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="text-[13px] font-semibold text-slate-900">{contact_person}</div>
                      <div className="font-mono text-slate-500 text-[12px] mt-1">{mobile_no}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[14px] text-slate-900">{institute_name}</div>
                      <div className="font-hindi-hint text-slate-500 text-[12px] mt-1">{district}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[12px] font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {LEAD_STATUS_OPTIONS.find(o => o.value === lead.status)?.label || lead.status}
                      </span>
                      {lead.whatsapp_status && lead.whatsapp_status !== 'not_sent' && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="material-symbols-outlined text-[11px]">chat</span>
                            {String(lead.whatsapp_status).replace('_', ' ')}
                          </span>
                          {lead.reply_status && lead.reply_status !== 'awaiting' && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                              lead.reply_status === 'positive' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : lead.reply_status === 'negative' ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {String(lead.reply_status).replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900 text-[14px]">
                      {lead.next_followup_date ? (
                        <div className="flex items-center gap-1 text-[#B45309]">
                          <span className="material-symbols-outlined text-[14px]">event</span>
                          {formatDate(lead.next_followup_date)}
                        </div>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[14px] text-slate-500">{agent_name}</td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-slate-400 group-hover:text-[#1E40AF] transition-colors focus:outline-none p-1 rounded hover:bg-slate-100">
                        <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">No leads found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="font-mono text-[12px] text-slate-500">
            Showing {leads.length > 0 ? (page - 1) * limit + 1 : 0}-{Math.min(page * limit, total)} of {total} leads
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= total}
              className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <LeadDrawer 
        lead={selectedLead} 
        onClose={() => setSelectedLead(null)} 
      />
    </div>
  );
}

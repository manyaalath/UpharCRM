'use client';

import { useState } from 'react';
import LeadDrawer from './LeadDrawer';
import { LEAD_STATUS_COLORS, LEAD_STATUS_OPTIONS, Lead } from '@/lib/types';
import { ALL_DISTRICTS } from '@/lib/constants';

export default function LeadsClient({ initialData, totalCount, agents }: { initialData: Lead[], totalCount: number, agents: string[] }) {
  const [leads] = useState<Lead[]>(initialData);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-md text-slate-900 hover:bg-slate-50 transition-colors text-[13px] font-semibold w-full sm:w-auto shadow-sm">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2 bg-[#FBBF24] rounded-md text-[#78350F] font-bold hover:bg-[#F59E0B] transition-colors text-[13px] w-full sm:w-auto shadow-md">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Lead
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-sm flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[13px] font-semibold text-slate-500 mb-1">Search Leads</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input 
                type="text" 
                placeholder="Name, Institute, Phone..." 
                className="w-full bg-white border border-slate-200 rounded-md py-2 pl-10 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] text-[14px]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-500 mb-1">Status</label>
            <select className="w-full bg-white border border-slate-200 rounded-md py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] text-[14px] outline-none appearance-none">
              <option value="">All Statuses</option>
              {LEAD_STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-500 mb-1">District</label>
            <select className="w-full bg-white border border-slate-200 rounded-md py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] text-[14px] outline-none appearance-none">
              <option value="">All Districts</option>
              {ALL_DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-slate-500 mb-1">Representative</label>
            <select className="w-full bg-white border border-slate-200 rounded-md py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] text-[14px] outline-none appearance-none">
              <option value="">All Representatives</option>
              {agents.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
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
              {leads.map((lead) => {
                const colors = LEAD_STATUS_COLORS[lead.status] || LEAD_STATUS_COLORS.new;
                return (
                  <tr 
                    key={lead.id} 
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <div className="text-[13px] font-semibold text-slate-900">{lead.contact_person}</div>
                      <div className="font-mono text-slate-500 text-[12px] mt-1">{lead.mobile_no}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[14px] text-slate-900">{lead.institute_name}</div>
                      <div className="font-hindi-hint text-slate-500 text-[12px] mt-1">{lead.district}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[12px] font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {LEAD_STATUS_OPTIONS.find(o => o.value === lead.status)?.label || lead.status}
                      </span>
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
                    <td className="py-3 px-4 text-[14px] text-slate-500">{lead.agent_name || 'Unassigned'}</td>
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
            Showing 1-{leads.length} of {totalCount} leads
          </div>
          <div className="flex gap-2">
            <button className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900 disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-900">
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

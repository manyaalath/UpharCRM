'use client';

import { useState, useEffect, useCallback } from 'react';
import { Challan } from '@/lib/types';
import type { UserRole } from '@/lib/types';
import { ALL_DISTRICTS } from '@/lib/constants';

interface BookOption {
  id: string;
  title: string;
}

export default function RecordsClient({ initialData, totalCount, agents }: { initialData: Challan[], totalCount: number, agents?: string[] }) {
  const [challans, setChallans] = useState<Challan[]>(initialData);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [bookOptions, setBookOptions] = useState<BookOption[]>([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [agentName, setAgentName] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [book, setBook] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(totalCount);
  const limit = 20;

  useEffect(() => {
    // Fetch current user role
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUserRole(data.role as UserRole); })
      .catch(() => {});
  }, []);

  // Fetch book options for filter dropdown
  useEffect(() => {
    fetch('/api/specimen-books')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.data) setBookOptions(data.data); })
      .catch(() => {});
  }, []);

  const fetchChallans = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (district) params.append('district', district);
    if (agentName) params.append('agent_name', agentName);
    if (dateStart) params.append('date_start', dateStart);
    if (dateEnd) params.append('date_end', dateEnd);
    if (book) params.append('book', book);
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    try {
      const res = await fetch(`/api/challans?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setChallans(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch challans:', err);
    }
  }, [search, district, agentName, dateStart, dateEnd, book, page]);

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

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
      link.setAttribute('download', `challans_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert('Export failed');
    }
  };

  const canExport = userRole && !['rep', 'telecaller'].includes(userRole);

  return (
    <div className="p-6 flex-grow flex flex-col">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 pb-1 border-b-2 border-[#1E40AF]">
        <h2 className="text-[24px] font-bold text-slate-900 tracking-tight">All Challan Records</h2>
        <div className="flex space-x-2 mt-2 md:mt-0">
          <a href="/data-entry" className="px-4 py-2 bg-[#1E40AF] text-white text-[12px] font-semibold rounded hover:bg-blue-800 transition-colors flex items-center shadow-sm">
            <span className="material-symbols-outlined text-[18px] mr-1">add</span> New Challan
          </a>
          {canExport && (
            <button onClick={handleExport} className="px-4 py-2 border border-[#1E40AF] text-[#1E40AF] text-[12px] font-semibold rounded hover:bg-blue-50 transition-colors flex items-center bg-white">
              <span className="material-symbols-outlined text-[18px] mr-1">download</span> Export
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="flex-grow relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text" 
            placeholder="Search Challan #, Name, Institute..." 
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded text-sm focus:border-[#1E40AF] focus:ring-2 focus:ring-[#DBEAFE] outline-none"
          />
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <select 
            value={book}
            onChange={e => { setBook(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded py-2 px-3 focus:border-[#1E40AF] focus:ring-2 focus:ring-[#DBEAFE] text-sm bg-white outline-none min-w-[180px]"
          >
            <option value="">Book: All</option>
            {bookOptions.map(b => (
              <option key={b.id} value={b.title}>{b.title}</option>
            ))}
          </select>
          <div className="flex gap-1 border border-slate-200 rounded px-1 items-center bg-white w-min">
             <input type="date" value={dateStart} onChange={e => { setDateStart(e.target.value); setPage(1); }} className="p-1 text-sm bg-transparent outline-none max-w-[120px]" title="Start Date" />
             <span className="text-slate-400">-</span>
             <input type="date" value={dateEnd} onChange={e => { setDateEnd(e.target.value); setPage(1); }} className="p-1 text-sm bg-transparent outline-none max-w-[120px]" title="End Date" />
          </div>
          <select value={district} onChange={e => { setDistrict(e.target.value); setPage(1); }} className="border border-slate-200 rounded py-2 px-3 focus:border-[#1E40AF] focus:ring-2 focus:ring-[#DBEAFE] text-sm bg-white outline-none">
            <option value="">District: All</option>
            {ALL_DISTRICTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {agents && (
            <select value={agentName} onChange={e => { setAgentName(e.target.value); setPage(1); }} className="border border-slate-200 rounded py-2 px-3 focus:border-[#1E40AF] focus:ring-2 focus:ring-[#DBEAFE] text-sm bg-white outline-none">
              <option value="">Rep: All</option>
              {agents.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg flex-grow flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto flex-grow">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b-2 border-[#1E40AF] sticky top-0 z-10">
              <tr>
                <th className="py-2 px-4 text-[12px] font-semibold text-slate-600 whitespace-nowrap">Challan #</th>
                <th className="py-2 px-4 text-[12px] font-semibold text-slate-600 whitespace-nowrap">Date</th>
                <th className="py-2 px-4 text-[12px] font-semibold text-slate-600 whitespace-nowrap">Name</th>
                <th className="py-2 px-4 text-[12px] font-semibold text-slate-600 whitespace-nowrap">Institute</th>
                <th className="py-2 px-4 text-[12px] font-semibold text-slate-600 whitespace-nowrap">Village/Town</th>
                <th className="py-2 px-4 text-[12px] font-semibold text-slate-600 whitespace-nowrap">District</th>
                <th className="py-2 px-4 text-[12px] font-semibold text-slate-600 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {challans.map((challan: any, idx) => {
                const instContact = Array.isArray(challan.leads?.institute_contacts) 
                  ? challan.leads?.institute_contacts[0] 
                  : challan.leads?.institute_contacts;
                
                const teacher_name = instContact?.contacts?.name || 'Unknown';
                const institute_name = instContact?.institutes?.name || 'Unknown';
                const village_town = instContact?.institutes?.village_town;
                const district = instContact?.institutes?.locations?.district || 'Unknown';

                return (
                  <tr key={challan.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors h-[40px]`}>
                    <td className="py-1 px-4 text-[12px] font-mono font-medium text-[#1E40AF]">{challan.challan_no}</td>
                    <td className="py-1 px-4 text-[14px] text-slate-900">{challan.challan_date}</td>
                    <td className="py-1 px-4 text-[14px] text-slate-900">{teacher_name}</td>
                    <td className="py-1 px-4 text-[14px] text-slate-900">{institute_name}</td>
                    <td className="py-1 px-4 text-[14px] text-slate-500">{village_town || '-'}</td>
                    <td className="py-1 px-4 text-[14px] text-slate-900">{district}</td>
                    <td className="py-1 px-4 text-right">
                      <button className="text-[#1E40AF] hover:text-blue-800">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {challans.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-sm">No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-50 border-t border-slate-200 p-2 flex items-center justify-between">
          <span className="text-[12px] text-slate-500">Showing {challans.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} entries</span>
          <div className="flex space-x-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 text-slate-500 hover:text-[#1E40AF] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= total}
              className="p-1 text-slate-500 hover:text-[#1E40AF] disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

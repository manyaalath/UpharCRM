'use client';

import { useState } from 'react';
import { Challan } from '@/lib/types';

export default function RecordsClient({ initialData, totalCount }: { initialData: Challan[], totalCount: number }) {
  const [challans] = useState<Challan[]>(initialData);
  
  return (
    <div className="p-6 flex-grow flex flex-col">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 pb-1 border-b-2 border-[#1E40AF]">
        <h2 className="text-[24px] font-bold text-slate-900 tracking-tight">All Challan Records</h2>
        <div className="flex space-x-2 mt-2 md:mt-0">
          <a href="/data-entry" className="px-4 py-2 bg-[#1E40AF] text-white text-[12px] font-semibold rounded hover:bg-blue-800 transition-colors flex items-center shadow-sm">
            <span className="material-symbols-outlined text-[18px] mr-1">add</span> New Challan
          </a>
          <button className="px-4 py-2 border border-[#1E40AF] text-[#1E40AF] text-[12px] font-semibold rounded hover:bg-blue-50 transition-colors flex items-center bg-white">
            <span className="material-symbols-outlined text-[18px] mr-1">download</span> Export
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 flex flex-col md:flex-row gap-4 shadow-sm">
        <div className="flex-grow relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text" 
            placeholder="Search Challan #, Name, Institute..." 
            className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded text-sm focus:border-[#1E40AF] focus:ring-2 focus:ring-[#DBEAFE] outline-none"
          />
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <select className="border border-slate-200 rounded py-2 px-3 focus:border-[#1E40AF] focus:ring-2 focus:ring-[#DBEAFE] text-sm bg-white outline-none">
            <option>Date Range: All Time</option>
            <option>Last 7 Days</option>
            <option>This Month</option>
          </select>
          <select className="border border-slate-200 rounded py-2 px-3 focus:border-[#1E40AF] focus:ring-2 focus:ring-[#DBEAFE] text-sm bg-white outline-none">
            <option>District: All</option>
            <option>Lucknow</option>
            <option>Kanpur</option>
            <option>Varanasi</option>
          </select>
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
                <th className="py-2 px-4 text-[12px] font-semibold text-slate-600 whitespace-nowrap">District</th>
                <th className="py-2 px-4 text-[12px] font-semibold text-slate-600 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {challans.map((challan, idx) => (
                <tr key={challan.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors h-[40px]`}>
                  <td className="py-1 px-4 text-[12px] font-mono font-medium text-[#1E40AF]">{challan.challan_no}</td>
                  <td className="py-1 px-4 text-[14px] text-slate-900">{challan.challan_date}</td>
                  <td className="py-1 px-4 text-[14px] text-slate-900">{challan.teacher_name}</td>
                  <td className="py-1 px-4 text-[14px] text-slate-900">{challan.institute_name}</td>
                  <td className="py-1 px-4 text-[14px] text-slate-900">{challan.district}</td>
                  <td className="py-1 px-4 text-right">
                    <button className="text-[#1E40AF] hover:text-blue-800">
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
              {challans.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">No records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-50 border-t border-slate-200 p-2 flex items-center justify-between">
          <span className="text-[12px] text-slate-500">Showing 1 to {challans.length} of {totalCount} entries</span>
          <div className="flex space-x-1">
            <button className="p-1 text-slate-500 hover:text-[#1E40AF] disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="w-8 h-8 rounded bg-[#1E40AF] text-white text-[12px] font-semibold flex items-center justify-center">1</button>
            <button className="w-8 h-8 rounded text-slate-500 hover:bg-slate-200 text-[12px] font-semibold flex items-center justify-center border border-transparent hover:border-slate-300">2</button>
            <button className="p-1 text-slate-500 hover:text-[#1E40AF]">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

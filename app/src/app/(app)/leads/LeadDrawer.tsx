import { Lead, LEAD_STATUS_COLORS, LEAD_STATUS_OPTIONS } from '@/lib/types';
import { useEffect, useRef } from 'react';

export default function LeadDrawer({ lead, onClose }: { lead: Lead | null, onClose: () => void }) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!lead) return null;

  const colors = LEAD_STATUS_COLORS[lead.status] || LEAD_STATUS_COLORS.new;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-40 transition-opacity" 
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        ref={drawerRef}
        className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white border-l border-slate-200 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0">
          <div>
            <h2 className="text-[20px] font-semibold text-[#1E40AF] m-0">Lead Details</h2>
            <hr className="w-8 h-[2px] bg-[#1E40AF] border-none mt-1" />
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 focus:outline-none p-1 rounded-full hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Drawer Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          
          {/* Quick Info Card */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4 relative">
            <div className="absolute top-4 right-4">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-[12px] font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                {LEAD_STATUS_OPTIONS.find(o => o.value === lead.status)?.label || lead.status}
              </span>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <span className="material-symbols-outlined text-slate-500">person</span>
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-slate-900 text-lg">{lead.contact_person}</h3>
                <p className="text-[14px] text-slate-500">{lead.institute_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <span className="block text-[12px] text-slate-500 font-mono uppercase tracking-wide">Phone</span>
                <span className="font-mono text-[14px] text-slate-900 mt-1">{lead.mobile_no}</span>
              </div>
              <div>
                <span className="block text-[12px] text-slate-500 font-mono uppercase tracking-wide">District</span>
                <span className="font-hindi-hint text-[14px] text-slate-900 mt-1">{lead.district}</span>
              </div>
            </div>
          </div>

          {/* Interaction History */}
          <div>
            <h4 className="text-[13px] font-semibold text-[#1E40AF] uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">
              Interaction History
            </h4>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200 ml-2">
              
              {/* Timeline Item - Remarks */}
              {lead.remarks && (
                <div className="relative flex items-start justify-between gap-4">
                  <div className="w-3 h-3 rounded-full bg-[#FBBF24] ring-4 ring-slate-50 z-10 mt-1 relative left-[-6px]"></div>
                  <div className="flex-1 bg-white border border-slate-200 shadow-sm rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[13px] font-semibold text-slate-900">Latest Remarks</span>
                      {lead.last_contact_date && (
                        <span className="font-mono text-[12px] text-slate-500">{lead.last_contact_date}</span>
                      )}
                    </div>
                    <p className="text-[14px] text-slate-500 mt-1">{lead.remarks}</p>
                  </div>
                </div>
              )}

              {/* Timeline Item - Creation */}
              <div className="relative flex items-start justify-between gap-4">
                <div className="w-3 h-3 rounded-full bg-slate-200 ring-4 ring-slate-50 z-10 mt-1 relative left-[-6px] border border-slate-300"></div>
                <div className="flex-1 bg-white border border-slate-200 rounded-lg p-3 opacity-70">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[13px] font-semibold text-slate-900">Lead Created</span>
                    <span className="font-mono text-[12px] text-slate-500">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[14px] text-slate-500 mt-1">
                    Auto-generated from Challan {lead.challan_no}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white sticky bottom-0 flex gap-3">
          <button className="flex-1 py-2 px-4 bg-white border border-slate-200 rounded-md text-slate-900 hover:bg-slate-50 transition-colors text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E40AF]">
            Edit Lead
          </button>
          <button className="flex-1 py-2 px-4 bg-[#1E40AF] rounded-md text-white hover:bg-[#1E3A8A] transition-colors text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E40AF] shadow-md">
            Log Action
          </button>
        </div>
      </div>
    </>
  );
}

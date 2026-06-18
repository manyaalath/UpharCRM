'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface PendingLead {
  id: string;
  contact_person: string;
  institute_name: string;
  district: string;
}

interface DashboardData {
  summary: {
    total_challans: number;
    total_institutions: number;
    total_leads: number;
    leads_pending_followup: number;
    leads_not_contacted: number;
    challans_this_month: number;
  };
  districtData: { district: string; count: number }[];
  leadStatusData: { status: string; count: number }[];
  pendingLeads: PendingLead[];
  agentData: { agent_name: string; challan_count: number; lead_count: number }[];
}

const COLORS = ['#1E40AF', '#FBBF24', '#93C5FD', '#E5E7EB', '#3730A3', '#D1FAE5'];

export default function DashboardClient({ data }: { data: DashboardData }) {
  const { summary, districtData, leadStatusData, pendingLeads, agentData } = data;

  return (
    <div className="flex-1 p-6 pb-24 md:pb-6 w-full max-w-[1600px] mx-auto">
      {/* Page Header */}
      <header className="mb-10">
        <h2 className="text-[32px] font-bold text-slate-900 mb-1 tracking-tight">
          Dashboard
        </h2>
        <hr className="border-0 h-[2px] bg-[#1E40AF] w-full max-w-[200px] mt-1" />
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-4 rounded shadow-sm border-t-2 border-[#1E40AF] border-x border-b border-slate-200 flex flex-col justify-between h-[120px]">
          <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Challans</span>
          <span className="font-mono text-[32px] font-bold text-slate-900">{summary.total_challans}</span>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border-t-2 border-[#1E40AF] border-x border-b border-slate-200 flex flex-col justify-between h-[120px]">
          <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Schools</span>
          <span className="font-mono text-[32px] font-bold text-slate-900">{summary.total_institutions}</span>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border-t-2 border-[#1E40AF] border-x border-b border-slate-200 flex flex-col justify-between h-[120px]">
          <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Leads</span>
          <span className="font-mono text-[32px] font-bold text-slate-900">{summary.total_leads}</span>
        </div>
        <div className="bg-white p-4 rounded shadow-sm border-t-2 border-[#1E40AF] border-x border-b border-slate-200 flex flex-col justify-between h-[120px]">
          <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Pending</span>
          <span className="font-mono text-[32px] font-bold text-[#FBBF24]">{summary.leads_pending_followup}</span>
        </div>
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Bar Chart: District Distribution */}
        <div className="bg-white p-4 rounded shadow-sm border border-slate-200 col-span-1 lg:col-span-2 flex flex-col min-h-[300px]">
          <h3 className="text-[20px] font-semibold text-slate-900 mb-4">District-wise Distribution</h3>
          <div className="flex-1 w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtData}>
                <XAxis dataKey="district" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="count" fill="#1E40AF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Lead Status */}
        <div className="bg-white p-4 rounded shadow-sm border border-slate-200 flex flex-col min-h-[300px]">
          <h3 className="text-[20px] font-semibold text-slate-900 mb-4">Lead Status</h3>
          <div className="flex-1 w-full h-[200px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leadStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {leadStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center pointer-events-none">
              <span className="block font-mono text-[24px] font-bold text-slate-900">{summary.total_leads}</span>
              <span className="text-[13px] font-semibold text-slate-500">Total</span>
            </div>
          </div>
        </div>
      </section>

      {/* Data Tables Section */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Pending Follow-ups */}
        <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-[20px] font-semibold text-slate-900">Pending Follow-ups</h3>
            <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] px-2 py-1 rounded-sm uppercase tracking-wide border border-[#FBBF24] font-semibold">
              Action Required
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-[13px] font-semibold text-slate-500 uppercase p-2">Name</th>
                  <th className="text-[13px] font-semibold text-slate-500 uppercase p-2">Institute</th>
                  <th className="text-[13px] font-semibold text-slate-500 uppercase p-2">District</th>
                  <th className="text-[13px] font-semibold text-slate-500 uppercase p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[14px]">
                {pendingLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="p-2 text-slate-900">{lead.contact_person}</td>
                    <td className="p-2 text-slate-500">{lead.institute_name}</td>
                    <td className="p-2 text-slate-500">{lead.district}</td>
                    <td className="p-2 text-right">
                      <button className="bg-[#1E40AF] text-white px-3 py-1 rounded text-sm hover:bg-blue-800 transition-colors flex items-center justify-center gap-1 ml-auto">
                        <span className="material-symbols-outlined text-[16px]">call</span> Call
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingLeads.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-500 font-sans">No pending follow-ups</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Representative Performance */}
        <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-[20px] font-semibold text-slate-900">Representative Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-[13px] font-semibold text-slate-500 uppercase p-2">Representative Name</th>
                  <th className="text-[13px] font-semibold text-slate-500 uppercase p-2 text-right">Challans</th>
                  <th className="text-[13px] font-semibold text-slate-500 uppercase p-2 text-right">Leads</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[14px]">
                {agentData.map((agent, i) => (
                  <tr key={i} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="p-2 text-slate-900 flex items-center gap-2 font-sans">
                      <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold uppercase">
                        {agent.agent_name.substring(0, 2)}
                      </div>
                      {agent.agent_name}
                    </td>
                    <td className="p-2 text-right text-slate-900">{agent.challan_count}</td>
                    <td className="p-2 text-right text-slate-500">{agent.lead_count}</td>
                  </tr>
                ))}
                {agentData.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-500 font-sans">No representative data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

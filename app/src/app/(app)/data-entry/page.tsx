'use client';

import { useState, useEffect } from 'react';
import { Challan } from '@/lib/types';

export default function DataEntryPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [recentEntries, setRecentEntries] = useState<Challan[]>([]);

  // Form state
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [teacherName, setTeacherName] = useState('');
  const [instituteName, setInstituteName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [agentName, setAgentName] = useState('');
  
  // Tag input state
  const [specimens, setSpecimens] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');

  useEffect(() => {
    // Generate a random challan number placeholder (or could fetch next sequence from API)
    setChallanNo(`CHL-${Math.floor(1000 + Math.random() * 9000)}`);
    fetchAgents();
    fetchRecentEntries();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.data) setAgents(data.data);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const fetchRecentEntries = async () => {
    try {
      const res = await fetch('/api/challans?limit=5');
      const data = await res.json();
      if (data.data) setRecentEntries(data.data);
    } catch (err) {
      console.error('Error fetching recent entries:', err);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentTag.trim() !== '') {
      e.preventDefault();
      if (!specimens.includes(currentTag.trim())) {
        setSpecimens([...specimens, currentTag.trim()]);
      }
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSpecimens(specimens.filter((tag) => tag !== tagToRemove));
  };

  const handleClear = () => {
    setChallanNo(`CHL-${Math.floor(1000 + Math.random() * 9000)}`);
    setChallanDate(new Date().toISOString().split('T')[0]);
    setTeacherName('');
    setInstituteName('');
    setAddress('');
    setDistrict('');
    setPincode('');
    setMobileNo('');
    setAgentName('');
    setSpecimens([]);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        challan_no: challanNo,
        challan_date: challanDate,
        teacher_name: teacherName,
        institute_name: instituteName,
        address,
        district,
        pincode,
        mobile_no: mobileNo,
        specimens_given: specimens,
        agent_name: agentName,
      };

      const res = await fetch('/api/challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save record');
      }

      setSuccess(true);
      fetchRecentEntries();
      // Optional: Clear form after successful save
      // handleClear();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center pb-24 md:pb-8 pt-4 md:pt-8 px-4 w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-[720px] flex flex-col gap-8">
        
        {/* Sticky Top Actions */}
        <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm py-4 flex justify-between items-center border-b border-slate-200 mb-4">
          <h2 className="text-[20px] font-semibold text-slate-900">New Entry</h2>
          <div className="flex gap-3">
            <div className="relative hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input 
                type="text" 
                placeholder="Search entries..." 
                className="bg-white border border-slate-300 rounded pl-9 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 w-48 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              />
            </div>
          </div>
        </div>

        {/* Header & Signature Rule */}
        <div className="mb-2">
          <h1 className="text-[32px] font-bold text-slate-900 leading-tight">New Challan Entry</h1>
          <hr className="h-[3px] bg-[#1E40AF] border-none mt-2 w-full rounded-full" />
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-4 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-md bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
            <span className="material-symbols-outlined">check_circle</span>
            Record saved successfully!
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
            
            {/* Challan No */}
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-semibold text-slate-700">Challan No.</label>
              <div className="flex items-center justify-between">
                <input 
                  type="text"
                  value={challanNo}
                  onChange={(e) => setChallanNo(e.target.value)}
                  className="font-mono text-[#1E40AF] font-bold bg-transparent border-none focus:ring-0 p-0"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setChallanNo(`CHL-${Math.floor(1000 + Math.random() * 9000)}`)}
                  className="text-slate-400 hover:text-[#1E40AF]"
                  title="Regenerate"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                </button>
              </div>
              <div className="h-[1px] bg-slate-200 w-full mt-1"></div>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                Date <span className="font-hindi-hint text-slate-500 font-normal">तारीख</span>
              </label>
              <input 
                type="date" 
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
                required
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              />
            </div>

            {/* Teacher Name */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                Teacher / Contact Name <span className="font-hindi-hint text-slate-500 font-normal">शिक्षक / संपर्क का नाम</span>
              </label>
              <input 
                type="text" 
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                required
                placeholder="Enter full name"
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              />
            </div>

            {/* Institute Name */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                Institute / School / Shop <span className="font-hindi-hint text-slate-500 font-normal">संस्थान / स्कूल / दुकान</span>
              </label>
              <input 
                type="text" 
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
                required
                placeholder="Enter institution name"
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              />
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                Address <span className="font-hindi-hint text-slate-500 font-normal">पता</span>
              </label>
              <textarea 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={2}
                placeholder="Street address, block, etc."
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              ></textarea>
            </div>

            {/* District Dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                District <span className="font-hindi-hint text-slate-500 font-normal">ज़िला</span>
              </label>
              <select 
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              >
                <option value="">Select District</option>
                <option value="Agra">Agra</option>
                <option value="Aligarh">Aligarh</option>
                <option value="Prayagraj">Prayagraj</option>
                <option value="Kanpur">Kanpur</option>
                <option value="Lucknow">Lucknow</option>
                <option value="Meerut">Meerut</option>
                <option value="Varanasi">Varanasi</option>
              </select>
            </div>

            {/* Pincode & Mobile */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-semibold text-slate-700">Pincode</label>
                <input 
                  type="text" 
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-semibold text-slate-700">Mobile</label>
                <input 
                  type="tel" 
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="10-digit"
                  className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                />
              </div>
            </div>

            {/* Specimens Given (Tags) */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                Specimens Given <span className="font-hindi-hint text-slate-500 font-normal">दिए गए नमूने</span>
              </label>
              <div className="flex flex-wrap gap-2 border border-slate-300 bg-white rounded p-2 min-h-[48px] items-start shadow-sm focus-within:ring-2 focus-within:ring-[#1E40AF]">
                {specimens.map((tag) => (
                  <span key={tag} className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-1 rounded-full text-xs flex items-center gap-1 font-medium">
                    {tag} 
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-blue-900 flex items-center">
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </span>
                ))}
                <input 
                  type="text" 
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={specimens.length === 0 ? "Type specimen name and press Enter..." : "Add another..."}
                  className="bg-transparent border-none focus:ring-0 text-sm w-48 p-1 text-slate-900 flex-grow placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>

            {/* Agent */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[13px] font-semibold text-slate-700">Assigned Agent</label>
              <select 
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                required
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              >
                <option value="">Select Agent</option>
                {agents.map(a => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
                <option value="Agent A">Agent A</option>
                <option value="Agent B">Agent B</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 mt-2 border-t border-slate-200 md:col-span-2 justify-end">
              <button 
                type="button" 
                onClick={handleClear}
                className="px-6 py-2 bg-[#FBBF24] text-slate-900 hover:bg-[#F59E0B] transition-colors rounded text-[13px] font-bold shadow-sm"
              >
                Clear Form
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="px-6 py-2 bg-[#1E40AF] text-white hover:bg-[#1e3a8a] transition-colors rounded text-[13px] font-bold shadow-md disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Entries Table */}
        <div className="mt-4 flex flex-col gap-4">
          <h3 className="text-[20px] font-semibold text-slate-900">Today&apos;s Entries</h3>
          <div className="w-full overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1E40AF]">
                  <th className="py-3 px-4 text-[13px] font-semibold text-white uppercase tracking-wider">Challan No.</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-white uppercase tracking-wider">Institute</th>
                  <th className="py-3 px-4 text-[13px] font-semibold text-white uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map(entry => (
                  <tr key={entry.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600">{entry.challan_no}</td>
                    <td className="py-3 px-4 text-sm text-slate-900 font-medium">{entry.institute_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{entry.challan_date}</td>
                  </tr>
                ))}
                {recentEntries.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 px-4 text-center text-slate-500 text-sm">No entries yet today.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

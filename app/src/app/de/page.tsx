'use client';

import { useState, useEffect } from 'react';
import { Challan } from '@/lib/types';

// ── District data ─────────────────────────────────────────────────────────────
const BIHAR_DISTRICTS = [
  'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur',
  'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj',
  'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj',
  'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda',
  'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran',
  'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali',
  'West Champaran',
];

const JHARKHAND_DISTRICTS = [
  'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum',
  'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara',
  'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu',
  'Ramgarh', 'Ranchi', 'Sahebganj', 'Seraikela Kharsawan', 'Simdega',
  'West Singhbhum',
];

const STATE_OPTIONS = ['Bihar', 'Jharkhand', 'Other'];

function getDistrictsForState(state: string): string[] {
  if (state === 'Bihar') return BIHAR_DISTRICTS;
  if (state === 'Jharkhand') return JHARKHAND_DISTRICTS;
  return [];
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function DEDataEntryPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [recentEntries, setRecentEntries] = useState<Challan[]>([]);
  const [specimenBooks, setSpecimenBooks] = useState<{ id: string; name: string; book_code: string | null }[]>([]);

  // Form state
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [teacherName, setTeacherName] = useState('');
  const [instituteName, setInstituteName] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [otherState, setOtherState] = useState('');
  const [district, setDistrict] = useState('');
  const [otherDistrict, setOtherDistrict] = useState('');
  const [pincode, setPincode] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [agentName, setAgentName] = useState('');
  const [specimens, setSpecimens] = useState<string[]>([]);
  
  // Specimen Search State
  const [specimenSearch, setSpecimenSearch] = useState('');
  const [showSpecimenDropdown, setShowSpecimenDropdown] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchRecentEntries();
    fetchSpecimenBooks();
  }, []);

  // Reset district when state changes
  useEffect(() => {
    setDistrict('');
    setOtherDistrict('');
  }, [state]);

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

  const fetchSpecimenBooks = async () => {
    try {
      const res = await fetch('/api/specimen-books');
      const data = await res.json();
      if (data.data) setSpecimenBooks(data.data);
    } catch (err) {
      console.error('Error fetching specimen books:', err);
    }
  };

  const handleMobileChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setMobileNo(digits);
    if (digits.length > 0 && digits.length < 10) {
      setMobileError('Mobile number must be exactly 10 digits');
    } else {
      setMobileError('');
    }
  };

  const toggleSpecimen = (displayName: string) => {
    setSpecimens(prev =>
      prev.includes(displayName) ? prev.filter(s => s !== displayName) : [...prev, displayName]
    );
    setSpecimenSearch('');
    setShowSpecimenDropdown(false);
  };

  const getBookDisplayName = (book: { name: string; book_code: string | null }) => {
    return book.book_code ? `${book.book_code} - ${book.name}` : book.name;
  };

  // Filter specimen books based on search
  const filteredSpecimenBooks = specimenBooks.filter(book => {
    const searchLower = specimenSearch.toLowerCase();
    const nameMatch = book.name.toLowerCase().includes(searchLower);
    const codeMatch = book.book_code?.toLowerCase().includes(searchLower);
    return nameMatch || codeMatch;
  });

  // Effective district value to send to API
  const effectiveState = state === 'Other' ? otherState : state;
  const effectiveDistrict = district === 'Other' ? otherDistrict : district;

  const handleClear = () => {
    setChallanNo('');
    setChallanDate(new Date().toISOString().split('T')[0]);
    setTeacherName('');
    setInstituteName('');
    setAddress('');
    setState('');
    setOtherState('');
    setDistrict('');
    setOtherDistrict('');
    setPincode('');
    setMobileNo('');
    setMobileError('');
    setAgentName('');
    setSpecimens([]);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Extra client-side mobile validation
    if (!/^\d{10}$/.test(mobileNo)) {
      setMobileError('Mobile number must be exactly 10 digits');
      return;
    }

    if (!effectiveDistrict.trim()) {
      setError('Please specify a district');
      return;
    }

    if (state === 'Other' && !otherState.trim()) {
      setError('Please specify a state');
      return;
    }

    if (specimens.length === 0) {
      setError('Please select at least one specimen book');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challan_no: challanNo,
          challan_date: challanDate,
          teacher_name: teacherName,
          institute_name: instituteName,
          address,
          district: effectiveDistrict,
          pincode,
          mobile_no: mobileNo,
          specimens_given: specimens,
          agent_name: agentName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save record');

      setSuccess(true);
      fetchRecentEntries();
      setChallanNo('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const districtOptions = getDistrictsForState(state);

  return (
    <div className="flex-grow flex flex-col items-center pb-10 pt-6 px-4 w-full max-w-full">
      <div className="w-full max-w-[720px] flex flex-col gap-8">
        <div className="mb-2">
          <h1 className="text-[28px] font-bold text-slate-900 leading-tight">New Challan Entry</h1>
          <hr className="h-[3px] bg-amber-400 border-none mt-2 w-full rounded-full" />
        </div>

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

        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">

            {/* Challan No */}
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-semibold text-slate-700">
                Challan No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={challanNo}
                onChange={(e) => setChallanNo(e.target.value)}
                required
                placeholder="Enter challan number"
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                Date <span className="text-slate-500 font-normal">तारीख</span>
              </label>
              <input
                type="date"
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
                required
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Teacher Name */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                Teacher / Shopkeeper Name <span className="text-slate-500 font-normal">शिक्षक / दुकानदार का नाम</span>
              </label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                required
                placeholder="Enter full name"
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Institute */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                Institute / School / Shop <span className="text-slate-500 font-normal">संस्थान / स्कूल / दुकान</span>
              </label>
              <input
                type="text"
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
                required
                placeholder="Enter institution name"
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                Address <span className="text-slate-500 font-normal">पता</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={2}
                placeholder="Street address, block, etc."
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* State */}
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                State <span className="text-slate-500 font-normal">राज्य</span>
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select State</option>
                {STATE_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {state === 'Other' && (
                <input
                  type="text"
                  value={otherState}
                  onChange={(e) => setOtherState(e.target.value)}
                  required
                  placeholder="Enter state name"
                  className="mt-2 bg-white border border-amber-300 rounded px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              )}
            </div>

            {/* District */}
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                District <span className="text-slate-500 font-normal">ज़िला</span>
              </label>
              {state === '' ? (
                <select
                  disabled
                  className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-400 shadow-sm cursor-not-allowed"
                >
                  <option>Select state first</option>
                </select>
              ) : state === 'Other' ? (
                <input
                  type="text"
                  value={otherDistrict}
                  onChange={(e) => setOtherDistrict(e.target.value)}
                  required
                  placeholder="Enter district name"
                  className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              ) : (
                <>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    required
                    className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="">Select District</option>
                    {districtOptions.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    <option value="Other">Other</option>
                  </select>
                  {district === 'Other' && (
                    <input
                      type="text"
                      value={otherDistrict}
                      onChange={(e) => setOtherDistrict(e.target.value)}
                      required
                      placeholder="Enter district name"
                      className="mt-2 bg-white border border-amber-300 rounded px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  )}
                </>
              )}
            </div>

            {/* Pincode & Mobile */}
            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-semibold text-slate-700">Pincode</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-semibold text-slate-700">Mobile</label>
                <input
                  type="tel"
                  value={mobileNo}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  required
                  maxLength={10}
                  placeholder="10-digit number"
                  className={`bg-white border rounded px-3 py-2 text-slate-900 shadow-sm font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 ${mobileError ? 'border-red-400 focus:ring-red-400' : 'border-slate-300'}`}
                />
                {mobileError && (
                  <span className="text-[11px] text-red-500 mt-0.5">{mobileError}</span>
                )}
              </div>
            </div>

            {/* Specimen Books */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-[13px] font-semibold text-slate-700 flex justify-between">
                Specimen Books Given <span className="text-slate-500 font-normal">दिए गए किताबों के नमूने</span>
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  value={specimenSearch}
                  onChange={(e) => {
                    setSpecimenSearch(e.target.value);
                    setShowSpecimenDropdown(true);
                  }}
                  onFocus={() => setShowSpecimenDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSpecimenDropdown(false), 200)}
                  placeholder="Search by book name or code..."
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                
                {showSpecimenDropdown && filteredSpecimenBooks.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredSpecimenBooks.map(book => {
                      const displayName = getBookDisplayName(book);
                      const isSelected = specimens.includes(displayName);
                      return (
                        <div
                          key={book.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            toggleSpecimen(displayName);
                          }}
                          className={`px-3 py-2 cursor-pointer text-sm transition-colors ${
                            isSelected ? 'bg-amber-50 text-amber-900' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              {book.book_code && <span className="text-[10px] font-mono text-slate-400">{book.book_code}</span>}
                              <span>{book.name}</span>
                            </div>
                            {isSelected && <span className="material-symbols-outlined text-[16px] text-amber-500">check</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {showSpecimenDropdown && specimenSearch && filteredSpecimenBooks.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg p-3 text-sm text-slate-500 text-center">
                    No books found matching &quot;{specimenSearch}&quot;
                  </div>
                )}
              </div>

              {specimens.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {specimens.map(specimen => (
                    <div
                      key={specimen}
                      className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded-full text-xs flex items-center gap-1 font-medium shadow-sm"
                    >
                      {specimen}
                      <button
                        type="button"
                        onClick={() => toggleSpecimen(specimen)}
                        className="hover:text-amber-900 focus:outline-none flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agent */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-[13px] font-semibold text-slate-700">Assigned Representative</label>
              <select
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                required
                className="bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Select Representative</option>
                {agents.map(a => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 mt-2 border-t border-slate-200 md:col-span-2 justify-end">
              <button
                type="button"
                onClick={handleClear}
                className="px-6 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors rounded text-[13px] font-bold shadow-sm"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-amber-500 text-white hover:bg-amber-600 transition-colors rounded text-[13px] font-bold shadow-md disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Entries */}
        <div className="mt-2 flex flex-col gap-4">
          <h3 className="text-[18px] font-semibold text-slate-900">Today&apos;s Entries</h3>
          <div className="w-full overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-amber-500">
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
                    <td colSpan={3} className="py-4 px-4 text-center text-slate-500 text-sm">No entries yet.</td>
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

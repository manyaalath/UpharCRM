'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { ImportValidationResult } from '@/lib/types';

type Step = 'upload' | 'review' | 'committing' | 'summary';

export default function ImportPage() {
  const [step, setStep] = useState<Step>('upload');
  const [filename, setFilename] = useState('');
  const [results, setResults] = useState<ImportValidationResult[]>([]);
  const [summary, setSummary] = useState<{ total: number; newCount: number; duplicateCount: number; errorCount: number } | null>(null);
  const [commitSummary, setCommitSummary] = useState<{ totalRows: number; rowsCreated: number; rowsMerged: number; rowsSkipped: number; rowsErrored: number; importLogId?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse uploaded file and send to validation API
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setLoading(true);
    setFilename(file.name);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (jsonRows.length === 0) {
        setError('The uploaded file has no data rows.');
        setLoading(false);
        return;
      }

      // Check required columns
      const headers = Object.keys(jsonRows[0] as Record<string, unknown>);
      const requiredCols = ['Lead Name', 'Phone Number', 'Lead Type'];
      const missingCols = requiredCols.filter(c =>
        !headers.some(h => h.toLowerCase().replace(/[_\s]/g, '') === c.toLowerCase().replace(/[_\s]/g, ''))
      );

      if (missingCols.length > 0) {
        setError(`Missing required columns: ${missingCols.join(', ')}. Please use the provided template.`);
        setLoading(false);
        return;
      }

      // Send to validation API
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: jsonRows }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Validation failed');
        setLoading(false);
        return;
      }

      const validationData = await res.json();
      setResults(validationData.results);
      setSummary(validationData.summary);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  // Update a specific row's action
  const updateRowAction = (rowIndex: number, action: 'create_new' | 'attach_to_lead' | 'skip') => {
    setResults(prev => prev.map(r =>
      r.row.rowIndex === rowIndex ? { ...r, action } : r
    ));
  };

  // Check if all duplicates are resolved
  const allResolved = results.every(r =>
    r.status !== 'duplicate' || r.action !== undefined
  );

  // Commit the import
  const handleCommit = async () => {
    setStep('committing');
    setError('');

    try {
      // Filter: skip errors that user hasn't resolved, include new + resolved duplicates
      const resolvedRows = results.filter(r => {
        if (r.status === 'error') return false; // errors can't be committed
        if (r.status === 'new') return true;
        if (r.status === 'duplicate') return r.action !== undefined;
        return false;
      }).map(r => ({
        ...r,
        action: r.action || (r.status === 'new' ? 'create_new' : undefined),
      }));

      const res = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, resolvedRows }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Commit failed');
        setStep('review');
        return;
      }

      const data = await res.json();
      setCommitSummary({ ...data.summary, importLogId: data.importLogId });
      setStep('summary');
    } catch {
      setError('Failed to commit import');
      setStep('review');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Import Leads & Challans</h1>
          <p className="text-sm text-slate-500 mt-1">Upload an Excel file to bulk-create leads and challans</p>
        </div>
        <a
          href="/api/import/template"
          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Download Template
        </a>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div
            className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400', 'bg-blue-50/30'); }}
            onDragLeave={e => { e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/30'); }}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50/30');
              const file = e.dataTransfer.files[0];
              if (file && fileInputRef.current) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInputRef.current.files = dt.files;
                fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-600">Parsing and validating...</p>
              </div>
            ) : (
              <>
                <span className="material-symbols-outlined text-[48px] text-slate-300 mb-3">upload_file</span>
                <h3 className="text-lg font-semibold text-slate-700 mb-1">Drop your Excel file here</h3>
                <p className="text-sm text-slate-500">or click to browse. Supports .xlsx and .csv</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5">info</span>
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Before uploading:</p>
                <ul className="list-disc ml-4 space-y-0.5 text-amber-700">
                  <li>Use the template above for correct column headers</li>
                  <li>One row per book line (multiple books per visit = multiple rows with same phone + date)</li>
                  <li>Phone numbers must be 10-digit Indian mobile numbers</li>
                  <li>Rep names must match existing representatives</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === 'review' && summary && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-green-700">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span className="text-sm font-semibold">New Leads</span>
              </div>
              <p className="text-3xl font-bold text-green-800 mt-2">{summary.newCount}</p>
              <p className="text-xs text-green-600 mt-1">Will be created</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-amber-700">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                <span className="text-sm font-semibold">Possible Duplicates</span>
              </div>
              <p className="text-3xl font-bold text-amber-800 mt-2">{summary.duplicateCount}</p>
              <p className="text-xs text-amber-600 mt-1">Needs your review</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-red-700">
                <span className="material-symbols-outlined text-[20px]">error</span>
                <span className="text-sm font-semibold">Errors</span>
              </div>
              <p className="text-3xl font-bold text-red-800 mt-2">{summary.errorCount}</p>
              <p className="text-xs text-red-600 mt-1">Cannot be imported</p>
            </div>
          </div>

          {/* Duplicates requiring resolution */}
          {summary.duplicateCount > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 bg-amber-50/50">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-[20px]">warning</span>
                  Resolve Duplicates ({results.filter(r => r.status === 'duplicate').length})
                </h3>
                <p className="text-xs text-slate-500 mt-1">Review each match and choose an action</p>
              </div>

              <div className="divide-y divide-slate-100">
                {results.filter(r => r.status === 'duplicate').map(result => (
                  <DuplicateRow
                    key={result.row.rowIndex}
                    result={result}
                    onAction={(action) => updateRowAction(result.row.rowIndex, action)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error rows */}
          {summary.errorCount > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 bg-red-50/50">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 text-[20px]">error</span>
                  Errors ({summary.errorCount})
                </h3>
                <p className="text-xs text-slate-500 mt-1">These rows will be skipped</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Row</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Lead Name</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Phone</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.filter(r => r.status === 'error').map(result => (
                      <tr key={result.row.rowIndex} className="border-b border-slate-100">
                        <td className="px-4 py-2.5 text-slate-500">#{result.row.rowIndex}</td>
                        <td className="px-4 py-2.5">{result.row.leadName || '—'}</td>
                        <td className="px-4 py-2.5">{result.row.phone || '—'}</td>
                        <td className="px-4 py-2.5">
                          <ul className="list-disc ml-3 text-red-600 text-xs space-y-0.5">
                            {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* New rows (collapsed by default) */}
          {summary.newCount > 0 && (
            <details className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <summary className="px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors">
                <span className="font-semibold text-slate-900 inline-flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                  New Leads ({summary.newCount}) — Click to expand
                </span>
              </summary>
              <div className="overflow-x-auto border-t border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Row</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Lead Name</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Phone</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Institute</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">District</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Book</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.filter(r => r.status === 'new').map(result => (
                      <tr key={result.row.rowIndex} className="border-b border-slate-100">
                        <td className="px-4 py-2.5 text-slate-500">#{result.row.rowIndex}</td>
                        <td className="px-4 py-2.5 font-medium">{result.row.leadName}</td>
                        <td className="px-4 py-2.5">{result.row.phone}</td>
                        <td className="px-4 py-2.5">{result.row.instituteName}</td>
                        <td className="px-4 py-2.5">{result.row.district || result.row.pincode}</td>
                        <td className="px-4 py-2.5">{result.row.bookTitle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <button
              onClick={() => { setStep('upload'); setResults([]); setSummary(null); setError(''); }}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              ← Upload Different File
            </button>
            <button
              onClick={handleCommit}
              disabled={!allResolved || summary.newCount + results.filter(r => r.status === 'duplicate' && r.action !== 'skip').length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1E40AF] text-white rounded-xl text-sm font-semibold hover:bg-[#1E3A8A] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-200"
            >
              <span className="material-symbols-outlined text-[18px]">publish</span>
              {allResolved ? 'Commit Import' : 'Resolve all duplicates first'}
            </button>
          </div>
        </div>
      )}

      {/* Step: Committing */}
      {step === 'committing' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-12 h-12 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <h3 className="text-lg font-semibold text-slate-700 mt-4">Importing data...</h3>
          <p className="text-sm text-slate-500 mt-1">Please don&apos;t close this page</p>
        </div>
      )}

      {/* Step: Summary */}
      {step === 'summary' && commitSummary && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <span className="material-symbols-outlined text-[48px] text-green-500 mb-2">task_alt</span>
            <h2 className="text-xl font-bold text-slate-900">Import Complete</h2>
            <p className="text-sm text-slate-500 mt-1">{filename}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 rounded-xl bg-green-50">
              <p className="text-2xl font-bold text-green-700">{commitSummary.rowsCreated}</p>
              <p className="text-xs text-green-600 mt-1">Created</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-blue-50">
              <p className="text-2xl font-bold text-blue-700">{commitSummary.rowsMerged}</p>
              <p className="text-xs text-blue-600 mt-1">Merged</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50">
              <p className="text-2xl font-bold text-slate-700">{commitSummary.rowsSkipped}</p>
              <p className="text-xs text-slate-600 mt-1">Skipped</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-red-50">
              <p className="text-2xl font-bold text-red-700">{commitSummary.rowsErrored}</p>
              <p className="text-xs text-red-600 mt-1">Errors</p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            {commitSummary.importLogId && (
              <a
                href={`/api/export?type=import-log&id=${commitSummary.importLogId}`}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Download Log
              </a>
            )}
            <button
              onClick={() => { setStep('upload'); setResults([]); setSummary(null); setCommitSummary(null); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1E40AF] text-white rounded-xl text-sm font-semibold hover:bg-[#1E3A8A] transition-all shadow-md shadow-blue-200"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Duplicate Row Component ──────────────────────────────────
function DuplicateRow({ result, onAction }: {
  result: ImportValidationResult;
  onAction: (action: 'create_new' | 'attach_to_lead' | 'skip') => void;
}) {
  const { row, matchType, existingLead, action } = result;

  return (
    <div className={`p-5 ${action ? 'bg-slate-50/50' : 'bg-white'} transition-colors`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-400">Row #{row.rowIndex}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          matchType === 'phone_exact'
            ? 'bg-amber-100 text-amber-700'
            : matchType === 'within_file'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {matchType === 'phone_exact' ? '📱 Exact Phone Match'
            : matchType === 'within_file' ? '📄 Duplicate in File'
            : '🔍 Fuzzy Name Match'}
        </span>
        {action && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            action === 'attach_to_lead' ? 'bg-blue-100 text-blue-700'
              : action === 'create_new' ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-600'
          }`}>
            ✓ {action === 'attach_to_lead' ? 'Will merge' : action === 'create_new' ? 'Create new' : 'Skip'}
          </span>
        )}
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Imported row */}
        <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl">
          <p className="text-xs font-semibold text-blue-600 mb-2">📥 FROM IMPORT</p>
          <div className="space-y-1 text-sm">
            <p><span className="text-slate-500">Name:</span> <span className="font-medium">{row.leadName}</span></p>
            <p><span className="text-slate-500">Phone:</span> <span className="font-medium">{row.phone}</span></p>
            <p><span className="text-slate-500">Institute:</span> {row.instituteName}</p>
            <p><span className="text-slate-500">District:</span> {row.district || row.pincode}</p>
            <p><span className="text-slate-500">Visit Date:</span> {row.visitDate}</p>
            <p><span className="text-slate-500">Book:</span> {row.bookTitle}</p>
          </div>
        </div>

        {/* Existing lead */}
        {existingLead && (
          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
            <p className="text-xs font-semibold text-amber-600 mb-2">📋 EXISTING LEAD ({existingLead.lead_seq_id})</p>
            <div className="space-y-1 text-sm">
              <p><span className="text-slate-500">Name:</span> <span className="font-medium">{existingLead.contactName}</span></p>
              <p><span className="text-slate-500">Phone:</span> <span className="font-medium">{existingLead.phone}</span></p>
              <p><span className="text-slate-500">Institute:</span> {existingLead.instituteName}</p>
              <p><span className="text-slate-500">District:</span> {existingLead.district}</p>
              <p><span className="text-slate-500">Last Visit:</span> {existingLead.lastVisitDate || 'N/A'}</p>
              <p><span className="text-slate-500">Last Books:</span> {existingLead.lastChallanBooks?.join(', ') || 'N/A'}</p>
              <p><span className="text-slate-500">Status:</span> {existingLead.status}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mt-3">
        {existingLead && (
          <button
            onClick={() => onAction('attach_to_lead')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              action === 'attach_to_lead'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
            }`}
          >
            Attach as new challan to existing lead
          </button>
        )}
        <button
          onClick={() => onAction('create_new')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            action === 'create_new'
              ? 'bg-green-600 text-white shadow-sm'
              : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
          }`}
        >
          Create as new lead
        </button>
        <button
          onClick={() => onAction('skip')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            action === 'skip'
              ? 'bg-slate-600 text-white shadow-sm'
              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          Skip row
        </button>
      </div>
    </div>
  );
}

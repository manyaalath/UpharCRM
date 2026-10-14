'use client';

import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { ArrowRight, Download, FileSpreadsheet, RotateCcw, Upload } from 'lucide-react';
import { Badge, Button, EmptyState, Panel, PanelHeader, Select, Stat, StatStrip, buttonClass, cn } from '@/components/ui';
import type { ImportValidationResult } from '@/lib/types';
import { downloadFromApi } from '@/lib/download';
import { formatDate } from '@/lib/date';

type Step = 'upload' | 'review' | 'done';
type Action = 'create_new' | 'attach_to_lead' | 'skip';
type Bucket = 'duplicates' | 'errors' | 'new';

interface CommitResult {
  importLogId: string | null;
  logError?: string;
  summary: { totalRows: number; rowsCreated: number; rowsMerged: number; rowsSkipped: number; rowsErrored: number };
  details: Array<{ rowIndex: number; status: string; message: string }>;
}

const REQUIRED_COLUMNS = ['Lead Name', 'Lead Type', 'Phone Number', 'Pincode', 'Rep Name', 'Visit Date'];
const BOOK_COLUMNS = ['Book Titles Given (Specimens)', 'Book Title'];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');

// The export sheet has title rows above the header, so find the header row
// (the first row that mentions "Phone Number") instead of assuming row 1.
function readRows(buf: ArrayBuffer): { rows: Record<string, unknown>[]; headers: string[] } {
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', blankrows: false });
  const headerIdx = grid.slice(0, 15).findIndex(r => Array.isArray(r) && r.some(c => norm(String(c)) === 'phonenumber'));
  if (headerIdx === -1) return { rows: [], headers: [] };
  const headers = (grid[headerIdx] as unknown[]).map(h => String(h).trim());
  const rows = grid.slice(headerIdx + 1).map(r => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { if (h) obj[h] = (r as unknown[])[i] ?? ''; });
    return obj;
  });
  // Drop blank rows and the template's example row.
  const nonBlank = rows.filter(r => Object.values(r).some(v => String(v).trim() !== ''));
  return { rows: nonBlank.filter(r => !String(r['Lead Name'] ?? '').trim().toUpperCase().startsWith('EXAMPLE')), headers };
}

const MATCH_LABEL: Record<string, { label: string; tone: 'warn' | 'info' | 'neutral' }> = {
  phone_exact: { label: 'Same phone', tone: 'warn' },
  name_fuzzy: { label: 'Similar name, same district', tone: 'info' },
  within_file: { label: 'Repeated line in file', tone: 'neutral' },
};

export default function BulkImportLeads() {
  const [step, setStep] = useState<Step>('upload');
  const [filename, setFilename] = useState('');
  const [results, setResults] = useState<ImportValidationResult[]>([]);
  const [bucket, setBucket] = useState<Bucket>('duplicates');
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [commit, setCommit] = useState<CommitResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploadError('');
    setParsing(true);
    setFilename(file.name);
    try {
      const { rows, headers } = readRows(await file.arrayBuffer());
      if (!headers.length) {
        setUploadError('Could not find the header row. Use the template — the header must include “Phone Number”.');
        return;
      }
      const have = new Set(headers.map(norm));
      const missing = REQUIRED_COLUMNS.filter(c => !have.has(norm(c)));
      if (!BOOK_COLUMNS.some(c => have.has(norm(c)))) missing.push(BOOK_COLUMNS[0]);
      if (missing.length) {
        setUploadError(`Missing columns: ${missing.join(', ')}. Download the template for the exact headers.`);
        return;
      }
      if (!rows.length) {
        setUploadError('The file has no data rows (the example row is ignored).');
        return;
      }

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data.error || 'Validation failed');
        return;
      }
      const list: ImportValidationResult[] = data.results || [];
      setResults(list);
      setBucket(list.some(r => r.status === 'duplicate') ? 'duplicates' : list.some(r => r.status === 'error') ? 'errors' : 'new');
      setStep('review');
    } catch (err) {
      setUploadError(err instanceof Error ? `Could not read the file: ${err.message}` : 'Could not read the file');
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const counts = useMemo(() => ({
    new: results.filter(r => r.status === 'new').length,
    duplicates: results.filter(r => r.status === 'duplicate').length,
    errors: results.filter(r => r.status === 'error').length,
  }), [results]);

  // Lead matches are decided per phone, so one decision covers every line of that phone.
  const dupGroups = useMemo(() => {
    const map = new Map<string, ImportValidationResult[]>();
    results
      .filter(r => r.status === 'duplicate' && r.matchType !== 'within_file')
      .forEach(r => {
        const key = r.row.phone;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      });
    return [...map.values()];
  }, [results]);
  const repeatedLines = results.filter(r => r.matchType === 'within_file');

  const unresolved = dupGroups.filter(g => !g[0].action).length;

  const setGroupAction = (phone: string, action: Action) =>
    setResults(prev => prev.map(r => (r.status === 'duplicate' && r.matchType !== 'within_file' && r.row.phone === phone ? { ...r, action } : r)));
  const setLineAction = (rowIndex: number, action: Action) =>
    setResults(prev => prev.map(r => (r.row.rowIndex === rowIndex ? { ...r, action } : r)));
  const applyToAll = (action: Action) =>
    setResults(prev => prev.map(r => (r.status === 'duplicate' && r.matchType !== 'within_file' ? { ...r, action } : r)));

  const toCommit = results.filter(r => r.status !== 'error' && r.action !== 'skip').length;

  const handleCommit = async () => {
    setCommitting(true);
    try {
      const res = await fetch('/api/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          resolvedRows: results.map(r => ({ row: r.row, action: r.status === 'new' ? 'create_new' : r.action })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Import failed');
        return;
      }
      setCommit(data);
      setStep('done');
      if (data.logError) toast.warning('Import finished, but the log could not be saved', { description: data.logError });
      try {
        const ch = new BroadcastChannel('dashboard-refresh');
        ch.postMessage('refresh');
        ch.close();
      } catch {
        // ignore
      }
    } catch {
      toast.error('Network error during import — check Records before retrying (re-running is safe)');
    } finally {
      setCommitting(false);
    }
  };

  const reset = () => {
    setStep('upload');
    setResults([]);
    setCommit(null);
    setFilename('');
    setUploadError('');
  };

  return (
    <div className="flex flex-col gap-5">
      <Stepper step={step} />

      {step === 'upload' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
          <label
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center cursor-pointer transition-colors',
              dragging ? 'border-accent bg-accent-soft/50' : 'border-line-strong bg-surface hover:bg-sunken/50'
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              disabled={parsing}
            />
            <Upload className="size-6 text-ink-3" />
            <div>
              <div className="text-[14px] font-medium text-ink">{parsing ? `Checking ${filename}…` : 'Drop the Excel file here, or click to choose'}</div>
              <div className="mt-1 text-[12.5px] text-ink-3">.xlsx, .xls or .csv · up to 5000 rows</div>
            </div>
            {parsing && <div className="h-1 w-40 overflow-hidden rounded-full bg-sunken"><div className="h-full w-1/3 bg-accent animate-[progress_1s_ease-in-out_infinite]" /></div>}
            {uploadError && <p className="max-w-md rounded-md bg-bad-soft px-3 py-2 text-[13px] text-bad">{uploadError}</p>}
          </label>

          <Panel>
            <PanelHeader title="Before you upload" />
            <ol className="list-decimal pl-9 pr-4 py-3 space-y-1.5 text-[13px] text-ink-2">
              <li>One row per book. Rows with the same phone and visit date become one challan.</li>
              <li>Dates as DD/MM/YYYY. Phone as 10 digits.</li>
              <li>Rep names must match the Representatives list exactly.</li>
              <li>Re-uploading the same file is safe — already imported visits are skipped.</li>
            </ol>
            <div className="px-4 pb-4">
              <a href="/api/import/template" className={buttonClass('secondary', 'md', 'w-full')}>
                <FileSpreadsheet className="size-4" />
                Download template
              </a>
            </div>
          </Panel>
          <style>{`@keyframes progress{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
        </div>
      )}

      {step === 'review' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] text-ink-2">
              <span className="font-medium text-ink">{filename}</span> · {results.length} rows checked
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={reset} icon={<RotateCcw className="size-3.5" />}>Choose another file</Button>
              <Button variant="primary" onClick={handleCommit} loading={committing} disabled={unresolved > 0 || toCommit === 0}>
                {unresolved > 0 ? `Resolve ${unresolved} duplicate${unresolved > 1 ? 's' : ''} first` : `Import ${toCommit} row${toCommit === 1 ? '' : 's'}`}
                {!committing && unresolved === 0 && <ArrowRight className="size-4" />}
              </Button>
            </div>
          </div>

          <Panel>
            <div role="tablist" className="flex gap-1 border-b border-line px-2">
              {([
                ['duplicates', 'Possible duplicates', counts.duplicates],
                ['errors', 'Errors', counts.errors],
                ['new', 'New leads', counts.new],
              ] as const).map(([id, label, n]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={bucket === id}
                  onClick={() => setBucket(id)}
                  className={cn(
                    'relative h-11 px-3 text-[13px] font-medium transition-colors',
                    bucket === id ? 'text-ink after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:bg-accent' : 'text-ink-2 hover:text-ink'
                  )}
                >
                  {label}
                  <span className={cn('ml-1.5 font-mono text-[12px]', id === 'errors' && n ? 'text-bad' : id === 'duplicates' && n ? 'text-warn' : 'text-ink-3')}>{n}</span>
                </button>
              ))}
            </div>

            {bucket === 'duplicates' && (
              counts.duplicates === 0 ? (
                <EmptyState title="No duplicates" description="None of these phone numbers or names match an existing lead." />
              ) : (
                <div>
                  {dupGroups.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-sunken/50 border-b border-line text-[12.5px] text-ink-2">
                      <span>{dupGroups.length} contact{dupGroups.length > 1 ? 's' : ''} match existing leads · {unresolved} need a decision</span>
                      <div className="flex items-center gap-2">
                        <span>Apply to all:</span>
                        <div className="w-44">
                          <Select defaultValue="" onChange={e => { if (e.target.value) applyToAll(e.target.value as Action); e.target.value = ''; }} className="h-7.5 text-[12.5px]">
                            <option value="">Choose…</option>
                            <option value="attach_to_lead">Attach to existing</option>
                            <option value="create_new">Create as new</option>
                            <option value="skip">Skip</option>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                  <ul className="divide-y divide-line">
                    {dupGroups.map(group => <DuplicateGroup key={group[0].row.phone} group={group} onAction={a => setGroupAction(group[0].row.phone, a)} />)}
                  </ul>
                  {repeatedLines.length > 0 && (
                    <div className="border-t border-line">
                      <div className="px-4 pt-3 pb-1 text-[12.5px] font-medium text-ink-2">Repeated lines (same phone, date and book) — skipped unless you keep them</div>
                      <table className="data-table">
                        <thead><tr><th>Row</th><th>Contact</th><th>Phone</th><th>Visit</th><th>Book</th><th className="w-40">Action</th></tr></thead>
                        <tbody>
                          {repeatedLines.map(r => (
                            <tr key={r.row.rowIndex}>
                              <td className="num">{r.row.rowIndex}</td>
                              <td>{r.row.leadName}</td>
                              <td className="font-mono text-[12.5px]">{r.row.phone}</td>
                              <td>{formatDate(r.row.visitDate)}</td>
                              <td>{r.row.bookTitle}</td>
                              <td>
                                <Select value={r.action || 'skip'} onChange={e => setLineAction(r.row.rowIndex, e.target.value as Action)} className="h-7.5 text-[12.5px]">
                                  <option value="skip">Skip</option>
                                  <option value="create_new">Keep line</option>
                                </Select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            )}

            {bucket === 'errors' && (
              counts.errors === 0 ? (
                <EmptyState title="No errors" description="Every row has the required fields." />
              ) : (
                <>
                  <p className="px-4 py-2.5 text-[12.5px] text-ink-2 bg-sunken/50 border-b border-line">
                    These rows will not be imported. Fix them in Excel and upload again — rows already imported are skipped automatically.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead><tr><th>Row</th><th>Contact</th><th>Phone</th><th>Problem</th></tr></thead>
                      <tbody>
                        {results.filter(r => r.status === 'error').map(r => (
                          <tr key={r.row.rowIndex}>
                            <td className="num align-top">{r.row.rowIndex}</td>
                            <td className="align-top">{r.row.leadName || <span className="text-ink-3">—</span>}</td>
                            <td className="align-top font-mono text-[12.5px]">{r.row.phone || '—'}</td>
                            <td>
                              <ul className="space-y-0.5 text-bad">
                                {r.errors.map(e => <li key={e}>{e}</li>)}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )
            )}

            {bucket === 'new' && (
              counts.new === 0 ? (
                <EmptyState title="No new leads" description="Every valid row matched an existing lead." />
              ) : (
                <div className="overflow-x-auto max-h-[60vh]">
                  <table className="data-table">
                    <thead><tr><th>Row</th><th>Contact</th><th>Phone</th><th>Institute</th><th>District</th><th>Visit</th><th>Book</th><th className="num">Qty</th><th>Rep</th></tr></thead>
                    <tbody>
                      {results.filter(r => r.status === 'new').map(r => (
                        <tr key={r.row.rowIndex}>
                          <td className="num">{r.row.rowIndex}</td>
                          <td>{r.row.leadName}</td>
                          <td className="font-mono text-[12.5px]">{r.row.phone}</td>
                          <td className="max-w-56 truncate">{r.row.instituteName}</td>
                          <td>{r.row.district || <span className="text-ink-3">{r.row.pincode}</span>}</td>
                          <td className="whitespace-nowrap">{formatDate(r.row.visitDate)}</td>
                          <td className="max-w-56 truncate">{r.row.bookTitle}</td>
                          <td className="num">{r.row.quantity}</td>
                          <td>{r.row.repName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </Panel>
        </>
      )}

      {step === 'done' && commit && (
        <>
          <StatStrip cols={4}>
            <Stat label="New leads created" value={commit.summary.rowsCreated} sub="rows" />
            <Stat label="Attached to existing" value={commit.summary.rowsMerged} sub="rows" />
            <Stat label="Skipped" value={commit.summary.rowsSkipped} sub="rows" />
            <Stat label="Errors" value={commit.summary.rowsErrored} sub="rows" />
          </StatStrip>

          <div className="flex flex-wrap gap-2">
            {commit.importLogId && (
              <Button
                onClick={() => downloadFromApi(`/api/export?type=import-log&id=${commit.importLogId}`, `import_log_${commit.importLogId}.xlsx`)}
                icon={<Download className="size-4" />}
              >
                Download import log
              </Button>
            )}
            <Button variant="primary" onClick={reset} icon={<Upload className="size-4" />}>Import another file</Button>
          </div>

          {commit.details.some(d => d.status !== 'created' && d.status !== 'merged') && (
            <Panel>
              <PanelHeader title="Rows not imported" meta={filename} />
              <div className="overflow-x-auto max-h-[50vh]">
                <table className="data-table">
                  <thead><tr><th>Row</th><th>Result</th><th>Reason</th></tr></thead>
                  <tbody>
                    {commit.details.filter(d => d.status !== 'created' && d.status !== 'merged').map(d => (
                      <tr key={`${d.rowIndex}-${d.status}`}>
                        <td className="num">{d.rowIndex}</td>
                        <td><Badge tone={d.status === 'error' ? 'bad' : 'neutral'}>{d.status === 'error' ? 'Error' : 'Skipped'}</Badge></td>
                        <td className="text-ink-2">{d.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: Array<[Step, string]> = [['upload', 'Upload'], ['review', 'Review'], ['done', 'Done']];
  const current = steps.findIndex(([s]) => s === step);
  return (
    <ol className="flex items-center gap-2 text-[13px]">
      {steps.map(([s, label], i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={cn(
              'grid place-items-center size-6 rounded-full font-mono text-[12px] border',
              i < current ? 'bg-ink text-white border-ink' : i === current ? 'border-accent text-accent bg-accent-soft' : 'border-line-strong text-ink-3'
            )}
          >
            {i + 1}
          </span>
          <span className={cn(i === current ? 'font-medium text-ink' : 'text-ink-3')}>{label}</span>
          {i < steps.length - 1 && <span className="mx-1 h-px w-8 bg-line-strong" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function DuplicateGroup({ group, onAction }: { group: ImportValidationResult[]; onAction: (a: Action) => void }) {
  const first = group[0];
  const lead = first.existingLead;
  const match = MATCH_LABEL[first.matchType || ''] || MATCH_LABEL.phone_exact;
  const visits = [...new Set(group.map(r => r.row.visitDate))];

  return (
    <li className="px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Badge tone={match.tone} dot>{match.label}</Badge>
          <span className="text-[12.5px] text-ink-3">Row{group.length > 1 ? 's' : ''} {group.map(r => r.row.rowIndex).join(', ')}</span>
        </div>
        <div className="w-56">
          <Select
            value={first.action || ''}
            onChange={e => onAction(e.target.value as Action)}
            aria-label="Action for this contact"
            aria-invalid={!first.action}
            className="h-8"
          >
            {!first.action && <option value="">Choose what to do…</option>}
            <option value="attach_to_lead">Attach as new visit to {lead?.lead_seq_id}</option>
            <option value="create_new">Create as a new lead</option>
            <option value="skip">Skip {group.length > 1 ? 'these rows' : 'this row'}</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-2">
        <Compare
          heading="In this file"
          rows={[
            ['Contact', first.row.leadName],
            ['Phone', <span key="p" className="font-mono">{first.row.phone}</span>],
            ['Institute', first.row.instituteName],
            ['District', first.row.district || `PIN ${first.row.pincode}`],
            ['Visit', visits.map(v => formatDate(v)).join(', ')],
            ['Books', group.map(r => `${r.row.bookTitle}${r.row.quantity > 1 ? ` ×${r.row.quantity}` : ''}`).join(', ')],
          ]}
        />
        <Compare
          heading={<>Existing lead <span className="font-mono font-normal text-ink-2">{lead?.lead_seq_id}</span></>}
          rows={[
            ['Contact', lead?.contactName || '—'],
            ['Phone', <span key="p" className="font-mono">{lead?.phone || '—'}</span>],
            ['Institute', lead?.instituteName || '—'],
            ['District', lead?.district || '—'],
            ['Last visit', lead?.lastVisitDate ? formatDate(lead.lastVisitDate) : '—'],
            ['Last books', lead?.lastChallanBooks?.length ? lead.lastChallanBooks.join(', ') : '—'],
          ]}
        />
      </div>
    </li>
  );
}

function Compare({ heading, rows }: { heading: React.ReactNode; rows: Array<[string, React.ReactNode]> }) {
  return (
    <div className="bg-surface">
      <div className="px-3 py-2 text-[12px] font-semibold text-ink-2 bg-sunken/60 border-b border-line">{heading}</div>
      <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1 px-3 py-2.5 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-3">{k}</dt>
            <dd className="text-ink min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

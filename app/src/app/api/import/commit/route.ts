import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getRequestSession } from '@/lib/session';
import { normalizePhone, normalizeLeadType, validateImportRows } from '@/lib/importValidator';
import type { ImportRow, ImportValidationResult } from '@/lib/types';
import { applyBookQuantities, normalizeSpecimens } from '@/app/api/challans/challanService';

export const maxDuration = 300;

type Action = 'create_new' | 'attach_to_lead' | 'skip';
type Detail = { rowIndex: number; status: 'created' | 'merged' | 'skipped' | 'error'; message: string };

const CONCURRENCY = 5;

// FNV-1a → short base36 tag, so the same book set always gives the same challan number.
function hashTag(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(-6);
}

// Deterministic per (phone, visit date, book set): re-importing the same file
// collides on challan_no instead of creating a second challan.
function importChallanNo(phone: string, visitDate: string, titles: string[]): string {
  const books = titles.map(t => t.trim().toLowerCase()).sort().join('|');
  return `IMP-${visitDate.replace(/-/g, '')}-${phone.slice(-6)}-${hashTag(books)}`;
}

// Was this exact visit already keyed in by hand? Same phone, same date, same books.
async function findEquivalentChallan(supabase: SupabaseClient, phone: string, visitDate: string, titles: string[]): Promise<string | null> {
  const { data: contacts } = await supabase.from('contacts').select('id').eq('mobile_no', phone).limit(10);
  if (!contacts?.length) return null;
  const { data: leads } = await supabase
    .from('leads')
    .select('id, institute_contacts!inner(contact_id)')
    .in('institute_contacts.contact_id', contacts.map(c => c.id));
  if (!leads?.length) return null;
  const { data: challans } = await supabase
    .from('challans')
    .select('challan_no, challan_books(books(title))')
    .in('lead_id', leads.map(l => l.id))
    .eq('challan_date', visitDate);
  const want = titles.map(t => t.trim().toLowerCase()).sort().join('|');
  for (const c of challans || []) {
    const have = ((c.challan_books as Array<{ books: { title: string } | { title: string }[] | null }>) || [])
      .map(cb => (Array.isArray(cb.books) ? cb.books[0]?.title : cb.books?.title) || '')
      .filter(Boolean)
      .map(t => t.trim().toLowerCase())
      .sort()
      .join('|');
    if (have === want) return c.challan_no as string;
  }
  return null;
}

async function runLimited<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  });
  await Promise.all(workers);
}

// POST /api/import/commit — { filename, resolvedRows: ImportValidationResult[] }
// Only the operator's chosen action is taken from the client. Row status,
// errors and the matched lead are recomputed here — client data is never trusted.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const filename = String(body?.filename || 'unknown.xlsx').slice(0, 200);
  const clientRows = body?.resolvedRows as ImportValidationResult[] | undefined;

  if (!Array.isArray(clientRows) || clientRows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
  }
  if (clientRows.length > 5000) {
    return NextResponse.json({ error: 'Import at most 5000 rows at a time' }, { status: 413 });
  }

  const supabase = await createClient();
  const session = await getRequestSession(request);

  // Re-validate from raw row data.
  const rows: ImportRow[] = clientRows.map((r, i) => ({ ...(r.row || {}), rowIndex: Number(r.row?.rowIndex) || i + 1 }) as ImportRow);
  const clientAction = new Map<number, Action | undefined>(clientRows.map((r, i) => [rows[i].rowIndex, r.action]));
  const checked = await validateImportRows(rows);

  const details: Detail[] = [];
  let rowsCreated = 0;
  let rowsMerged = 0;
  let rowsSkipped = 0;
  let rowsErrored = 0;

  type Line = { result: ImportValidationResult; action: Exclude<Action, 'skip'> };
  const lines: Line[] = [];

  for (const result of checked) {
    const idx = result.row.rowIndex;
    const wanted = clientAction.get(idx);

    if (result.status === 'error') {
      rowsErrored++;
      details.push({ rowIndex: idx, status: 'error', message: result.errors.join('; ') });
      continue;
    }
    if (wanted === 'skip') {
      rowsSkipped++;
      details.push({ rowIndex: idx, status: 'skipped', message: 'Skipped by operator' });
      continue;
    }

    let action: Exclude<Action, 'skip'> | null = null;
    if (result.status === 'new') action = 'create_new';
    else if (result.matchType === 'within_file') action = wanted === 'create_new' ? 'create_new' : null;
    else if (result.matchType === 'phone_exact') action = wanted === 'create_new' ? 'create_new' : 'attach_to_lead';
    else if (result.matchType === 'name_fuzzy') action = wanted === 'create_new' || wanted === 'attach_to_lead' ? wanted : null;

    if (!action) {
      rowsSkipped++;
      details.push({
        rowIndex: idx,
        status: 'skipped',
        message: result.matchType === 'within_file' ? 'Repeated line in the file' : 'Possible duplicate was not resolved',
      });
      continue;
    }
    lines.push({ result, action });
  }

  // One challan per phone + visit date. A phone's visits run in date order so a
  // lead created by its first visit receives the later ones.
  const groups = new Map<string, Line[]>();
  for (const line of lines) {
    const key = `${normalizePhone(line.result.row.phone)}|${line.result.row.visitDate}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(line);
  }
  const byPhone = new Map<string, Line[][]>();
  for (const [key, group] of groups) {
    const phone = key.split('|')[0];
    if (!byPhone.has(phone)) byPhone.set(phone, []);
    byPhone.get(phone)!.push(group);
  }
  byPhone.forEach(list => list.sort((a, b) => a[0].result.row.visitDate.localeCompare(b[0].result.row.visitDate)));

  const record = (group: Line[], status: Detail['status'], message: string) => {
    if (status === 'created') rowsCreated += group.length;
    else if (status === 'merged') rowsMerged += group.length;
    else if (status === 'skipped') rowsSkipped += group.length;
    else rowsErrored += group.length;
    details.push(...group.map(l => ({ rowIndex: l.result.row.rowIndex, status, message })));
  };

  await runLimited([...byPhone.entries()], CONCURRENCY, async ([phone, visits]) => {
    let leadFromThisImport = null as { id: string } | null;

    for (const group of visits) {
      const first = group[0].result;
      const row = first.row;
      const specimens = normalizeSpecimens(group.map(l => ({ title: l.result.row.bookTitle, quantity: l.result.row.quantity })));
      const titles = specimens.map(s => s.title);
      const challanNo = importChallanNo(phone, row.visitDate, titles);

      try {
        const { data: already } = await supabase.from('challans').select('id').eq('challan_no', challanNo).limit(1);
        if (already?.length) {
          record(group, 'skipped', `Already imported as ${challanNo}`);
          continue;
        }
        const equivalent = await findEquivalentChallan(supabase, phone, row.visitDate, titles);
        if (equivalent) {
          record(group, 'skipped', `Same visit already entered as challan ${equivalent}`);
          continue;
        }

        const wantsAttach = group.some(l => l.action === 'attach_to_lead') && !!first.existingLead?.id;
        const attachTo: string | null = leadFromThisImport?.id || (wantsAttach ? first.existingLead!.id : null);

        const { data: rpcData, error: rpcError } = await supabase.rpc('create_challan_transaction', {
          p_agent_name: row.repName || null,
          p_pincode: row.pincode || null,
          p_district: row.district || null,
          p_state: null,
          p_contact_name: row.leadName || 'Unknown',
          p_mobile_no: phone,
          p_alt_mobile_no: row.altPhone ? normalizePhone(row.altPhone) : null,
          p_institute_name: row.instituteName || 'Unknown',
          p_address_line: null,
          p_village_town: null,
          p_locality: null,
          p_challan_no: challanNo,
          p_challan_date: row.visitDate,
          p_specimens: titles,
          p_confirm_action: attachTo ? 'attach_to_lead' : 'create_new',
          p_existing_lead_id: attachTo,
          p_lead_type: normalizeLeadType(row.leadType) || null,
        });
        const rpcResult = rpcData as { success?: boolean; error?: string; detail?: string; challan_id?: string; lead_id?: string } | null;

        const code = rpcError?.code || (rpcResult && !rpcResult.success ? rpcResult.detail : null);
        if (code === '23505') {
          record(group, 'skipped', `Already imported as ${challanNo}`);
          continue;
        }
        if (rpcError || (rpcResult && !rpcResult.success)) {
          record(group, 'error', rpcError?.message || rpcResult?.error || 'Transaction failed');
          continue;
        }

        if (rpcResult?.challan_id) await applyBookQuantities(supabase, rpcResult.challan_id, specimens);

        if (attachTo) {
          const label = leadFromThisImport?.id === attachTo ? 'lead created earlier in this import' : `lead ${first.existingLead?.lead_seq_id}`;
          record(group, 'merged', `Challan ${challanNo} attached to ${label}`);
        } else {
          record(group, 'created', `New lead with challan ${challanNo}`);
          if (rpcResult?.lead_id) leadFromThisImport = { id: rpcResult.lead_id };
        }
      } catch (err) {
        record(group, 'error', err instanceof Error ? err.message : 'Unknown error');
      }
    }
  });

  details.sort((a, b) => a.rowIndex - b.rowIndex);

  // import_logs.user_id is NOT NULL → data_entry_users(id). The env bootstrap
  // admin has no row, so fall back to any admin account.
  let userId: string | null = session?.src === 'staff' ? session.uid : null;
  if (!userId) {
    const { data: admin } = await supabase.from('data_entry_users').select('id').eq('role', 'admin').limit(1);
    userId = admin?.[0]?.id ?? null;
  }

  let importLogId: string | null = null;
  let logError: string | undefined;
  if (userId) {
    const { data: importLog, error } = await supabase
      .from('import_logs')
      .insert({
        user_id: userId,
        filename,
        total_rows: clientRows.length,
        rows_created: rowsCreated,
        rows_merged: rowsMerged,
        rows_skipped: rowsSkipped,
        rows_errored: rowsErrored,
        details,
      })
      .select('id')
      .single();
    importLogId = importLog?.id ?? null;
    if (error) logError = error.message;
  } else {
    logError = 'No staff account to attribute the import log to';
  }

  return NextResponse.json({
    success: true,
    importLogId,
    logError,
    summary: { totalRows: clientRows.length, rowsCreated, rowsMerged, rowsSkipped, rowsErrored },
    details,
  });
}

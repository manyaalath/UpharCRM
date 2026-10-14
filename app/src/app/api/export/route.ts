import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';
import { getRequestSession } from '@/lib/session';
import { formatDateTime, isoDateIST } from '@/lib/date';
import { computeAnalytics, fetchAll, filtersFromParams, one } from '@/app/api/dashboard/analytics';

export const dynamic = 'force-dynamic';

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function fileResponse(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': XLSX_TYPE,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

// GET /api/export?type=leads|analytics|import-log&...
export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const exportType = searchParams.get('type') || 'leads';

  // Challan-entry operators may only download their import logs.
  if (session.role === 'data_entry' && exportType !== 'import-log') {
    return NextResponse.json({ error: 'You can only export import logs' }, { status: 403 });
  }

  try {
    switch (exportType) {
      case 'leads':
        return await exportLeads(searchParams);
      case 'analytics':
        return await exportAnalytics(searchParams);
      case 'import-log':
        return await exportImportLog(searchParams);
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Export failed' }, { status: 500 });
  }
}

// Resolve ?agent_id= or legacy ?agent_name= to an agent id. Returns
// undefined when no rep filter, null when the name matches nobody.
async function resolveAgentId(supabase: Awaited<ReturnType<typeof createClient>>, sp: URLSearchParams) {
  const id = sp.get('agent_id');
  if (id) return id;
  const name = sp.get('agent_name');
  if (!name) return undefined;
  const { data } = await supabase.from('agents').select('id').eq('name', name).limit(1);
  return data?.[0]?.id ?? null;
}

interface ExportChallan {
  challan_no: string;
  challan_date: string;
  leads: unknown;
  agents: unknown;
  challan_books: Array<{ quantity: number; books: unknown }> | null;
}

async function exportLeads(sp: URLSearchParams) {
  const supabase = await createClient();
  const filters = filtersFromParams(sp);
  const agentId = await resolveAgentId(supabase, sp);
  const bookId = sp.get('book');

  const rows: Record<string, unknown>[] = [];

  if (agentId !== null) {
    const district = filters.district;
    const leadsEmbed = district
      ? 'leads!inner(lead_seq_id, status, lead_type, institute_contacts!inner(contacts(name, mobile_no, alt_mobile_no), institutes!inner(name, locations!inner(district, pincode, state))))'
      : 'leads(lead_seq_id, status, lead_type, institute_contacts(contacts(name, mobile_no, alt_mobile_no), institutes(name, locations(district, pincode, state))))';
    const select = `id, challan_no, challan_date, ${leadsEmbed}, agents(name), challan_books(quantity, books(title))${bookId ? ', bookmatch:challan_books!inner(book_id)' : ''}`;

    const challans = await fetchAll<ExportChallan>((a, b) => {
      let q = supabase.from('challans').select(select).order('challan_date', { ascending: false }).order('id');
      if (district) q = q.eq('leads.institute_contacts.institutes.locations.district', district);
      if (agentId) q = q.eq('agent_id', agentId);
      if (filters.from) q = q.gte('challan_date', filters.from);
      if (filters.to) q = q.lte('challan_date', filters.to);
      if (bookId) q = q.eq('bookmatch.book_id', bookId);
      return q.range(a, b) as unknown as PromiseLike<{ data: ExportChallan[] | null; error: { message: string } | null }>;
    });

    for (const challan of challans) {
      const lead = one<Record<string, unknown>>(challan.leads as Record<string, unknown>);
      const ic = one<Record<string, unknown>>(lead?.institute_contacts as Record<string, unknown>);
      const contact = one(ic?.contacts as { name?: string; mobile_no?: string; alt_mobile_no?: string });
      const institute = one(ic?.institutes as { name?: string; locations?: unknown });
      const loc = one(institute?.locations as { district?: string; pincode?: string });
      const agent = one(challan.agents as { name?: string });
      const base = {
        'Lead Name': contact?.name || '',
        'Lead Type': (lead?.lead_type as string) || '',
        'Phone Number': contact?.mobile_no || '',
        'Alternate Phone': contact?.alt_mobile_no || '',
        'Pincode': loc?.pincode || '',
        'District': loc?.district || '',
        'School/Shop/Institution Name': institute?.name || '',
        'Rep Name': agent?.name || '',
        'Visit Date': challan.challan_date,
      };
      const tail = {
        'Remarks': '',
        'Lead ID': (lead?.lead_seq_id as string) || '',
        'Challan No': challan.challan_no,
        'Status': (lead?.status as string) || '',
      };
      const lines = challan.challan_books || [];
      if (lines.length) {
        for (const cb of lines) {
          rows.push({ ...base, 'Book Titles Given (Specimens)': one(cb.books as { title?: string })?.title || '', 'Quantity': cb.quantity, ...tail });
        }
      } else {
        rows.push({ ...base, 'Book Titles Given (Specimens)': '', 'Quantity': 0, ...tail });
      }
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(titleRows('Leads & challans', describeFilters(sp)));
  XLSX.utils.sheet_add_json(ws, rows, { origin: 'A5' });
  ws['!cols'] = [
    { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 9 },
    { wch: 16 }, { wch: 32 }, { wch: 20 }, { wch: 12 }, { wch: 32 },
    { wch: 9 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Leads & Challans');
  return fileResponse(wb, `uphar_leads_${isoDateIST()}.xlsx`);
}

async function exportAnalytics(sp: URLSearchParams) {
  const supabase = await createClient();
  const a = await computeAnalytics(supabase, filtersFromParams(sp));
  const which = sp.get('analytics_type') || 'all';
  const info = describeFilters(sp);
  const wb = XLSX.utils.book_new();

  const sheet = (name: string, rows: Record<string, unknown>[], cols: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(titleRows(name, info));
    XLSX.utils.sheet_add_json(ws, rows, { origin: 'A5' });
    ws['!cols'] = cols.map(wch => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  if (which === 'all' || which === 'summary') {
    sheet('Summary', [
      { Metric: 'Challans', Value: a.summary.challans.value, 'Previous period': a.summary.challans.prev ?? '' },
      { Metric: 'Leads', Value: a.summary.leads.value, 'Previous period': a.summary.leads.prev ?? '' },
      { Metric: 'Books distributed', Value: a.summary.books.value, 'Previous period': a.summary.books.prev ?? '' },
      { Metric: 'Open follow-ups', Value: a.summary.pending_followups, 'Previous period': '' },
      { Metric: 'Overdue follow-ups', Value: a.summary.overdue_followups, 'Previous period': '' },
      { Metric: 'Districts covered', Value: a.summary.districts_covered, 'Previous period': '' },
    ], [24, 12, 16]);
  }
  if (which === 'all' || which === 'district') {
    sheet('Districts', a.districts.map(s => ({
      District: s.district, Challans: s.challans, Leads: s.leads, 'Open follow-ups': s.pending_followups,
    })), [22, 12, 12, 16]);
  }
  if (which === 'all' || which === 'books') {
    sheet('Books', a.books.map(s => ({
      'Book title': s.title, 'Copies given': s.copies, 'Unique leads': s.unique_leads, 'Repeat copies': s.repeat,
    })), [36, 14, 14, 14]);
  }
  if (which === 'all' || which === 'representatives') {
    sheet('Representatives', a.reps.map(s => ({
      Representative: s.name, Challans: s.challans, Leads: s.leads, Interested: s.interested, 'Follow-ups done': s.followups_done,
    })), [26, 12, 12, 12, 16]);
  }

  return fileResponse(wb, `uphar_analytics_${isoDateIST()}.xlsx`);
}

async function exportImportLog(sp: URLSearchParams) {
  const logId = sp.get('id');
  if (!logId) return NextResponse.json({ error: 'Import log ID is required' }, { status: 400 });

  const supabase = await createClient();
  const { data: log } = await supabase.from('import_logs').select('*').eq('id', logId).maybeSingle();
  if (!log) return NextResponse.json({ error: 'Import log not found' }, { status: 404 });

  const summary = [
    ['Uphar CRM — Import log'],
    ['Filename', log.filename],
    ['Imported', formatDateTime(log.created_at)],
    ['Total rows', log.total_rows],
    ['Created', log.rows_created],
    ['Merged', log.rows_merged],
    ['Skipped', log.rows_skipped],
    ['Errors', log.rows_errored],
    [],
  ];
  const ws = XLSX.utils.aoa_to_sheet(summary);
  const details = (log.details as Array<{ rowIndex: number; status: string; message: string }>) || [];
  if (details.length) {
    XLSX.utils.sheet_add_json(ws, details.map(d => ({ 'Row #': d.rowIndex, Status: d.status, Message: d.message })), {
      origin: `A${summary.length + 1}`,
    });
  }
  ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Import Log');
  return fileResponse(wb, `import_log_${isoDateIST(new Date(log.created_at))}_${String(logId).slice(0, 8)}.xlsx`);
}

function titleRows(title: string, filterInfo: string) {
  return [[`Uphar CRM — ${title}`], [filterInfo], [`Generated: ${formatDateTime(new Date())} IST`], []];
}

function describeFilters(sp: URLSearchParams): string {
  const f = filtersFromParams(sp);
  const parts: string[] = [];
  if (f.district) parts.push(`District: ${f.district}`);
  if (sp.get('agent_name')) parts.push(`Rep: ${sp.get('agent_name')}`);
  if (sp.get('rep_label')) parts.push(`Rep: ${sp.get('rep_label')}`);
  if (sp.get('book_label')) parts.push(`Book: ${sp.get('book_label')}`);
  if (f.from) parts.push(`From: ${f.from}`);
  if (f.to) parts.push(`To: ${f.to}`);
  return parts.length ? `Filters: ${parts.join(' | ')}` : 'Filters: none (all records)';
}

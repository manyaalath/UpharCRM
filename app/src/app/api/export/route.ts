import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserContext, getDistrictFilter } from '@/lib/rbac';
import * as XLSX from 'xlsx';

// GET /api/export?type=leads|analytics|import-log&...
export async function GET(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Rep and telecaller cannot export
  if (['rep', 'telecaller'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Insufficient permissions to export' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const exportType = searchParams.get('type') || 'leads';

  switch (exportType) {
    case 'leads':
      return exportLeads(request, ctx, searchParams);
    case 'analytics':
      return exportAnalytics(request, ctx, searchParams);
    case 'import-log':
      return exportImportLog(request, ctx, searchParams);
    default:
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
  }
}

async function exportLeads(
  request: Request,
  ctx: Awaited<ReturnType<typeof getUserContext>> & {},
  searchParams: URLSearchParams
) {
  const supabase = await createClient();
  const districtFilter = getDistrictFilter(ctx);

  // Build query — no pagination, get all matching rows
  let query = supabase
    .from('challans')
    .select('challan_no, challan_date, leads!inner(lead_seq_id, status, lead_type, institute_contacts!inner(contacts(name, mobile_no, alt_mobile_no), institutes!inner(name, address_line, village_town, locality, locations!inner(district, pincode, state)))), agents(name), challan_books(books(title), quantity)')
    .order('challan_date', { ascending: false });

  // Apply district scoping
  if (districtFilter && districtFilter.length > 0) {
    query = query.in('leads.institute_contacts.institutes.locations.district', districtFilter);
  } else if (districtFilter && districtFilter.length === 0) {
    return generateEmptyXlsx('No data — no districts assigned');
  }

  // Additional filters
  const requestedDistrict = searchParams.get('district');
  if (requestedDistrict) {
    if (districtFilter && !districtFilter.includes(requestedDistrict)) {
      return NextResponse.json({ error: 'Access denied to this district' }, { status: 403 });
    }
    query = query.eq('leads.institute_contacts.institutes.locations.district', requestedDistrict);
  }
  if (searchParams.has('agent_name')) {
    query = query.eq('agents.name', searchParams.get('agent_name'));
  }
  if (searchParams.has('date_start')) {
    query = query.gte('challan_date', searchParams.get('date_start'));
  }
  if (searchParams.has('date_end')) {
    query = query.lte('challan_date', searchParams.get('date_end'));
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to flat rows matching import template format
  const rows: Record<string, unknown>[] = [];
  (data || []).forEach((challan: Record<string, unknown>) => {
    const lead = challan.leads as Record<string, unknown>;
    const ic = lead?.institute_contacts as Record<string, unknown>;
    const contact = ic?.contacts as { name?: string; mobile_no?: string; alt_mobile_no?: string };
    const institute = ic?.institutes as { name?: string; locations?: { district?: string; pincode?: string } };
    const agent = challan.agents as { name?: string };
    const challanBooks = challan.challan_books as Array<{ books: { title: string }; quantity: number }> | undefined;

    if (challanBooks && challanBooks.length > 0) {
      challanBooks.forEach(cb => {
        rows.push({
          'Lead Name': contact?.name || '',
          'Lead Type': lead?.lead_type || '',
          'Phone Number': contact?.mobile_no || '',
          'Alternate Phone': contact?.alt_mobile_no || '',
          'Pincode': institute?.locations?.pincode || '',
          'District': institute?.locations?.district || '',
          'School/Shop/Institution Name': institute?.name || '',
          'Rep Name': agent?.name || '',
          'Visit Date': challan.challan_date,
          'Book Titles Given (Specimens)': cb.books?.title || '',
          'Quantity': cb.quantity,
          'Remarks': '',
          'Lead ID': lead?.lead_seq_id || '',
          'Challan No': challan.challan_no,
          'Status': lead?.status || '',
        });
      });
    } else {
      rows.push({
        'Lead Name': contact?.name || '',
        'Lead Type': lead?.lead_type || '',
        'Phone Number': contact?.mobile_no || '',
        'Alternate Phone': contact?.alt_mobile_no || '',
        'Pincode': institute?.locations?.pincode || '',
        'District': institute?.locations?.district || '',
        'School/Shop/Institution Name': institute?.name || '',
        'Rep Name': agent?.name || '',
        'Visit Date': challan.challan_date,
        'Book Titles Given (Specimens)': '',
        'Quantity': 0,
        'Remarks': '',
        'Lead ID': lead?.lead_seq_id || '',
        'Challan No': challan.challan_no,
        'Status': lead?.status || '',
      });
    }
  });

  // Build xlsx
  const wb = XLSX.utils.book_new();

  // Add filter info header
  const filterInfo = buildFilterInfo(searchParams, ctx);
  const titleRow = [['Uphar CRM — Leads/Challans Export'], [filterInfo], ['Generated: ' + new Date().toISOString()], []];
  const ws = XLSX.utils.aoa_to_sheet(titleRow);
  XLSX.utils.sheet_add_json(ws, rows, { origin: 'A5' });

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
    { wch: 15 }, { wch: 30 }, { wch: 25 }, { wch: 12 }, { wch: 30 },
    { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Leads & Challans');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="uphar_leads_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}

async function exportAnalytics(
  request: Request,
  ctx: Awaited<ReturnType<typeof getUserContext>> & {},
  searchParams: URLSearchParams
) {
  const supabase = await createClient();
  const districtFilter = getDistrictFilter(ctx);
  const analyticsType = searchParams.get('analytics_type') || 'district';

  const wb = XLSX.utils.book_new();
  const filterInfo = buildFilterInfo(searchParams, ctx);
  const titleRows = [['Uphar CRM — Analytics Export'], [filterInfo], ['Generated: ' + new Date().toISOString()], []];

  if (analyticsType === 'district' || analyticsType === 'all') {
    // District analytics
    const { data: districtStats } = await supabase
      .from('mv_district_stats')
      .select('*');

    let filteredStats = districtStats || [];
    if (districtFilter && districtFilter.length > 0) {
      filteredStats = filteredStats.filter(s => districtFilter.includes(s.district));
    }

    const ws = XLSX.utils.aoa_to_sheet(titleRows);
    XLSX.utils.sheet_add_json(ws, filteredStats.map(s => ({
      'District': s.district,
      'Challans': s.challan_count,
      'Leads': s.lead_count,
      'Pending Follow-ups': s.followup_count,
    })), { origin: 'A5' });
    ws['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'District Analytics');
  }

  if (analyticsType === 'books' || analyticsType === 'all') {
    // Book analytics
    const { data: bookStats } = await supabase
      .from('mv_book_stats')
      .select('*');

    const ws2 = XLSX.utils.aoa_to_sheet(titleRows);
    XLSX.utils.sheet_add_json(ws2, (bookStats || []).map(s => ({
      'Book Title': s.book_name,
      'Times Distributed': s.distribution_count,
      'Unique Leads': s.unique_leads,
    })), { origin: 'A5' });
    ws2['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Book Analytics');
  }

  if (analyticsType === 'representatives' || analyticsType === 'all') {
    // Rep analytics — build from raw data
    let repQuery = supabase
      .from('agents')
      .select('name, challans(id), leads(id, status), follow_ups(id, status)')
      .eq('is_active', true);

    const { data: repData } = await repQuery;

    const repRows = (repData || []).map((rep: Record<string, unknown>) => {
      const challans = (rep.challans as Array<{ id: string }>) || [];
      const leads = (rep.leads as Array<{ id: string; status: string }>) || [];
      const followUps = (rep.follow_ups as Array<{ id: string; status: string }>) || [];

      return {
        'Representative': rep.name,
        'Challans': challans.length,
        'Total Leads': leads.length,
        'Interested Leads': leads.filter(l => l.status === 'interested').length,
        'Completed Follow-ups': followUps.filter(f => f.status === 'completed').length,
      };
    });

    const ws3 = XLSX.utils.aoa_to_sheet(titleRows);
    XLSX.utils.sheet_add_json(ws3, repRows, { origin: 'A5' });
    ws3['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Representative Analytics');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="uphar_analytics_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}

async function exportImportLog(
  request: Request,
  ctx: Awaited<ReturnType<typeof getUserContext>> & {},
  searchParams: URLSearchParams
) {
  const logId = searchParams.get('id');
  if (!logId) {
    return NextResponse.json({ error: 'Import log ID is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: log } = await supabase
    .from('import_logs')
    .select('*')
    .eq('id', logId)
    .single();

  if (!log) {
    return NextResponse.json({ error: 'Import log not found' }, { status: 404 });
  }

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['Uphar CRM — Import Log'],
    ['Filename', log.filename],
    ['Date', log.created_at],
    ['Total Rows', log.total_rows],
    ['Created', log.rows_created],
    ['Merged', log.rows_merged],
    ['Skipped', log.rows_skipped],
    ['Errors', log.rows_errored],
    [],
  ];

  const ws = XLSX.utils.aoa_to_sheet(summaryData);

  // Add details
  const details = (log.details as Array<{ rowIndex: number; status: string; message: string }>) || [];
  if (details.length > 0) {
    XLSX.utils.sheet_add_json(ws, details.map(d => ({
      'Row #': d.rowIndex,
      'Status': d.status,
      'Message': d.message,
    })), { origin: `A${summaryData.length + 1}` });
  }

  ws['!cols'] = [{ wch: 15 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Import Log');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="import_log_${logId}.xlsx"`,
    },
  });
}

function buildFilterInfo(searchParams: URLSearchParams, ctx: NonNullable<Awaited<ReturnType<typeof getUserContext>>>): string {
  const parts: string[] = [];
  if (searchParams.get('district')) parts.push(`District: ${searchParams.get('district')}`);
  if (searchParams.get('agent_name')) parts.push(`Rep: ${searchParams.get('agent_name')}`);
  if (searchParams.get('date_start')) parts.push(`From: ${searchParams.get('date_start')}`);
  if (searchParams.get('date_end')) parts.push(`To: ${searchParams.get('date_end')}`);
  parts.push(`User: ${ctx.name} (${ctx.role})`);
  return parts.length > 0 ? `Filters: ${parts.join(' | ')}` : 'No filters applied';
}

function generateEmptyXlsx(message: string) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([[message]]);
  XLSX.utils.book_append_sheet(wb, ws, 'Empty');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="uphar_export_empty.xlsx"',
    },
  });
}

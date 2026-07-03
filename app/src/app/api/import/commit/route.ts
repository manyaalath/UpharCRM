import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserContext, logAudit } from '@/lib/rbac';
import { normalizePhone, normalizeLeadType } from '@/lib/importValidator';
import type { ImportValidationResult } from '@/lib/types';

// POST /api/import/commit — Commit resolved import rows
export async function POST(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx || !['data_entry', 'manager', 'admin'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const { filename, resolvedRows } = body as {
    filename: string;
    resolvedRows: ImportValidationResult[];
  };

  if (!resolvedRows || !Array.isArray(resolvedRows)) {
    return NextResponse.json({ error: 'No resolved rows provided' }, { status: 400 });
  }

  const supabase = await createClient();
  let rowsCreated = 0;
  let rowsMerged = 0;
  let rowsSkipped = 0;
  let rowsErrored = 0;
  const details: Array<{ rowIndex: number; status: string; message: string }> = [];

  // Group rows by phone to create one challan per group (challan_group_id logic)
  // Each row represents one book-line — group by phone+visitDate for multi-book challans
  const challanGroups = new Map<string, ImportValidationResult[]>();
  for (const result of resolvedRows) {
    if (result.action === 'skip') {
      rowsSkipped++;
      details.push({ rowIndex: result.row.rowIndex, status: 'skipped', message: 'Skipped by operator' });
      continue;
    }

    const key = `${normalizePhone(result.row.phone)}|${result.row.visitDate}`;
    if (!challanGroups.has(key)) challanGroups.set(key, []);
    challanGroups.get(key)!.push(result);
  }

  // Process each challan group
  for (const [, groupRows] of challanGroups) {
    const firstRow = groupRows[0];
    const row = firstRow.row;
    const action = firstRow.action || (firstRow.status === 'new' ? 'create_new' : 'create_new');
    const existingLeadId = firstRow.existingLead?.id || null;

    try {
      // Generate a unique challan number for this import
      const timestamp = Date.now();
      const challanNo = `IMP-${timestamp}-${row.rowIndex}`;

      // Collect all book titles in this group
      const specimens = groupRows.map(r => r.row.bookTitle).filter(Boolean);

      // Resolve district from pincode if needed
      let district = row.district || '';
      if (!district && row.pincode) {
        const { data: loc } = await supabase
          .from('locations')
          .select('district')
          .eq('pincode', row.pincode)
          .single();
        if (loc) district = loc.district;
      }

      const rpcPayload = {
        p_agent_name: row.repName || null,
        p_pincode: row.pincode || null,
        p_district: district || null,
        p_state: null as string | null,
        p_contact_name: row.leadName || 'Unknown',
        p_mobile_no: normalizePhone(row.phone),
        p_alt_mobile_no: row.altPhone ? normalizePhone(row.altPhone) : null,
        p_institute_name: row.instituteName || 'Unknown',
        p_address_line: null as string | null,
        p_village_town: null as string | null,
        p_locality: null as string | null,
        p_challan_no: challanNo,
        p_challan_date: row.visitDate,
        p_specimens: specimens,
        p_confirm_action: action === 'attach_to_lead' ? 'attach_to_lead' : 'create_new',
        p_existing_lead_id: action === 'attach_to_lead' ? existingLeadId : null,
        p_lead_type: normalizeLeadType(row.leadType) || null,
      };

      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_challan_transaction', rpcPayload);

      if (rpcError) {
        rowsErrored += groupRows.length;
        details.push(...groupRows.map(r => ({
          rowIndex: r.row.rowIndex,
          status: 'error',
          message: rpcError.message,
        })));
        continue;
      }

      if (rpcResult && !rpcResult.success) {
        rowsErrored += groupRows.length;
        details.push(...groupRows.map(r => ({
          rowIndex: r.row.rowIndex,
          status: 'error',
          message: rpcResult.error || 'Transaction failed',
        })));
        continue;
      }

      if (action === 'attach_to_lead') {
        rowsMerged += groupRows.length;
        details.push(...groupRows.map(r => ({
          rowIndex: r.row.rowIndex,
          status: 'merged',
          message: `Attached to existing lead ${firstRow.existingLead?.lead_seq_id}`,
        })));
      } else {
        rowsCreated += groupRows.length;
        details.push(...groupRows.map(r => ({
          rowIndex: r.row.rowIndex,
          status: 'created',
          message: 'New lead and challan created',
        })));
      }
    } catch (err) {
      rowsErrored += groupRows.length;
      details.push(...groupRows.map(r => ({
        rowIndex: r.row.rowIndex,
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      })));
    }
  }

  // Save import log
  const { data: importLog } = await supabase
    .from('import_logs')
    .insert({
      user_id: ctx.userId === 'legacy-admin' ? null : ctx.userId,
      filename: filename || 'unknown.xlsx',
      total_rows: resolvedRows.length,
      rows_created: rowsCreated,
      rows_merged: rowsMerged,
      rows_skipped: rowsSkipped,
      rows_errored: rowsErrored,
      details,
    })
    .select('id')
    .single();

  // Audit
  await logAudit(ctx.userId, 'import_committed', importLog?.id, {
    filename,
    total: resolvedRows.length,
    created: rowsCreated,
    merged: rowsMerged,
    skipped: rowsSkipped,
    errored: rowsErrored,
  });

  return NextResponse.json({
    success: true,
    importLogId: importLog?.id,
    summary: {
      totalRows: resolvedRows.length,
      rowsCreated,
      rowsMerged,
      rowsSkipped,
      rowsErrored,
    },
    details,
  });
}

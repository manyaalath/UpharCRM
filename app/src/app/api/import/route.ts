import { NextResponse } from 'next/server';
import { getUserContext } from '@/lib/rbac';
import { parseExcelRow, validateImportRows } from '@/lib/importValidator';
import type { ImportRow } from '@/lib/types';

// POST /api/import — Validate uploaded rows
export async function POST(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx || !['data_entry', 'manager', 'admin'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const { rows: rawRows } = body;

  if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
  }

  // Parse raw Excel rows to ImportRow format
  const parsedRows: ImportRow[] = rawRows.map((raw: Record<string, unknown>, i: number) =>
    parseExcelRow(raw, i + 1)
  );

  // Validate all rows
  const results = await validateImportRows(parsedRows);

  const summary = {
    total: results.length,
    newCount: results.filter(r => r.status === 'new').length,
    duplicateCount: results.filter(r => r.status === 'duplicate').length,
    errorCount: results.filter(r => r.status === 'error').length,
  };

  return NextResponse.json({ results, summary });
}

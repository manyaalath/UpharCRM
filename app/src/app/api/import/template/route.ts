import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

// GET /api/import/template — Download import template .xlsx
export async function GET() {
  const supabase = await createClient();

  // Fetch active agents for dropdown validation
  const { data: agents } = await supabase
    .from('agents')
    .select('name')
    .eq('is_active', true)
    .order('name');

  const agentNames = (agents || []).map(a => a.name);

  // Fetch existing books for reference
  const { data: books } = await supabase
    .from('books')
    .select('title')
    .order('title');

  const bookTitles = (books || []).map(b => b.title);

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Headers
  const headers = [
    'Lead Name',
    'Lead Type',
    'Phone Number',
    'Alternate Phone',
    'Pincode',
    'District',
    'School/Shop/Institution Name',
    'Rep Name',
    'Visit Date',
    'Book Titles Given (Specimens)',
    'Quantity',
    'Remarks',
  ];

  // Example row
  const exampleRow = [
    'Ramesh Kumar',
    'Teacher',
    '9876543210',
    '',
    '800001',
    'Patna',
    'Govt. High School, Patna',
    agentNames[0] || 'Agent Name',
    '2024-01-15',
    bookTitles[0] || 'Mathematics Class 10',
    1,
    'Interested in more specimens',
  ];

  const wsData = [headers, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Lead Name
    { wch: 20 }, // Lead Type
    { wch: 15 }, // Phone Number
    { wch: 15 }, // Alternate Phone
    { wch: 10 }, // Pincode
    { wch: 15 }, // District
    { wch: 30 }, // Institution Name
    { wch: 25 }, // Rep Name
    { wch: 12 }, // Visit Date
    { wch: 30 }, // Book Titles
    { wch: 10 }, // Quantity
    { wch: 30 }, // Remarks
  ];

  // Add data validation for Lead Type
  if (!ws['!dataValidation']) ws['!dataValidation'] = [];

  XLSX.utils.book_append_sheet(wb, ws, 'Import Data');

  // Add a reference sheet with valid values
  const refData = [
    ['Lead Types', 'Representatives', 'Books (Reference)'],
    ['Teacher', agentNames[0] || '', bookTitles[0] || ''],
    ['Retail Salesperson', agentNames[1] || '', bookTitles[1] || ''],
    ['Shopkeeper', agentNames[2] || '', bookTitles[2] || ''],
    ['Institution', agentNames[3] || '', bookTitles[3] || ''],
  ];

  // Add remaining agents/books
  for (let i = 4; i < Math.max(agentNames.length, bookTitles.length); i++) {
    const row = ['', agentNames[i] || '', bookTitles[i] || ''];
    refData.push(row);
  }

  const refWs = XLSX.utils.aoa_to_sheet(refData);
  refWs['!cols'] = [
    { wch: 20 },
    { wch: 30 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, refWs, 'Reference Values');

  // Generate buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="uphar_import_template.xlsx"',
    },
  });
}

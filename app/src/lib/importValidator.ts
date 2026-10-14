// ============================================================
// Uphar CRM — Import Validator
// Validates Excel import rows, detects duplicates (within-file + DB)
// ============================================================

import { createClient } from '@/lib/supabase/server';
import type { ImportRow, ImportValidationResult } from '@/lib/types';
import { isoDateIST, todayIST } from '@/lib/date';

const LEAD_TYPE_MAP: Record<string, string> = {
  'teacher': 'teacher',
  'retail salesperson': 'retail_salesperson',
  'retail': 'retail_salesperson',
  'salesperson': 'retail_salesperson',
  'shopkeeper': 'shopkeeper',
  'shop': 'shopkeeper',
  'institution': 'institution',
  'institute': 'institution',
  'school': 'institution',
};

/**
 * Normalize phone number: strip spaces, dashes, country code.
 * Returns 10-digit string or original if can't normalize.
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.toString().replace(/[\s\-\(\)\.]/g, '');
  // Strip country code variants
  if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
  if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2);
  if (cleaned.startsWith('0') && cleaned.length === 11) cleaned = cleaned.slice(1);
  return cleaned;
}

/**
 * Normalize lead type from user input to enum value.
 */
export function normalizeLeadType(input: string): string | null {
  if (!input) return null;
  const lower = input.toLowerCase().trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return LEAD_TYPE_MAP[lower] || null;
}

/**
 * Simple Levenshtein distance for fuzzy name matching.
 */
function levenshtein(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= an; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bn; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }

  return matrix[an][bn];
}

/**
 * Check if two names are fuzzy-similar.
 * Returns true if Levenshtein distance is <= 20% of the longer string's length.
 */
function isFuzzyMatch(name1: string, name2: string): boolean {
  const a = name1.toLowerCase().trim();
  const b = name2.toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);
  return dist / maxLen <= 0.2;
}

/**
 * Validate a single row for field-level errors.
 */
function validateRow(row: ImportRow, activeAgentNames: Set<string>): string[] {
  const errors: string[] = [];

  if (!row.leadName?.trim()) errors.push('Lead Name is required');
  if (!row.phone?.trim()) {
    errors.push('Phone Number is required');
  } else if (!/^[6-9]\d{9}$/.test(normalizePhone(row.phone))) {
    errors.push('Phone Number must be a valid 10-digit Indian mobile number');
  }
  if (!row.leadType?.trim()) {
    errors.push('Lead Type is required');
  } else if (!normalizeLeadType(row.leadType)) {
    errors.push('Lead Type must be one of: Teacher, Retail Salesperson, Shopkeeper, Institution');
  }
  if (!row.pincode?.trim()) {
    errors.push('Pincode is required');
  } else if (!/^\d{6}$/.test(row.pincode.trim())) {
    errors.push('Pincode must be exactly 6 digits');
  }
  if (!row.instituteName?.trim()) errors.push('School/Shop/Institution Name is required');
  if (!row.repName?.trim()) {
    errors.push('Rep Name is required');
  } else if (!activeAgentNames.has(row.repName.trim().toLowerCase())) {
    errors.push(`Rep "${row.repName}" not found in active representatives`);
  }
  if (!row.visitDate) {
    errors.push('Visit Date is required');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.visitDate) || isNaN(new Date(row.visitDate).getTime())) {
    errors.push('Visit Date is not a valid date (use DD/MM/YYYY or YYYY-MM-DD)');
  } else if (row.visitDate > todayIST()) {
    errors.push('Visit Date cannot be in the future');
  }
  if (!row.bookTitle?.trim()) errors.push('Book Title is required');
  if (!row.quantity || row.quantity < 1) errors.push('Quantity must be at least 1');

  return errors;
}

/**
 * Parse raw Excel row data to ImportRow.
 */
export function parseExcelRow(rawRow: Record<string, unknown>, rowIndex: number): ImportRow {
  return {
    rowIndex,
    leadName: String(rawRow['Lead Name'] ?? rawRow['lead_name'] ?? '').trim(),
    leadType: String(rawRow['Lead Type'] ?? rawRow['lead_type'] ?? '').trim(),
    phone: normalizePhone(String(rawRow['Phone Number'] ?? rawRow['phone'] ?? rawRow['mobile_no'] ?? '')),
    altPhone: normalizePhone(String(rawRow['Alternate Phone'] ?? rawRow['alt_phone'] ?? '')),
    pincode: String(rawRow['Pincode'] ?? rawRow['pincode'] ?? '').trim(),
    district: String(rawRow['District'] ?? rawRow['district'] ?? '').trim() || undefined,
    instituteName: String(rawRow['School/Shop/Institution Name'] ?? rawRow['institute_name'] ?? '').trim(),
    repName: String(rawRow['Rep Name'] ?? rawRow['Rep ID'] ?? rawRow['rep_name'] ?? rawRow['agent_name'] ?? '').trim(),
    visitDate: parseDate(rawRow['Visit Date'] ?? rawRow['visit_date'] ?? rawRow['challan_date']),
    bookTitle: String(rawRow['Book Title'] ?? rawRow['Book Titles Given (Specimens)'] ?? rawRow['book_title'] ?? '').trim(),
    quantity: parseInt(String(rawRow['Quantity'] ?? rawRow['quantity'] ?? '1'), 10) || 1,
    remarks: String(rawRow['Remarks'] ?? rawRow['remarks'] ?? '').trim() || undefined,
  };
}

// Accepts Excel serial numbers, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY.
// Indian sheets write the day first, so never let JS guess MM/DD.
function parseDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return date.toISOString().slice(0, 10);
  }
  if (value instanceof Date && !isNaN(value.getTime())) return isoDateIST(value);
  const s = String(value).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const year = m[3].length === 2 ? `20${m[3]}` : m[3];
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return s;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return s;
}

// PostgREST returns at most 1000 rows per request — page through everything.
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type Row = Record<string, unknown>;
function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

interface LeadInfo {
  id: string;
  lead_seq_id: string;
  contactName: string;
  instituteName: string;
  district: string;
  phone: string;
  status: string;
}

function toLeadInfo(lead: Row): LeadInfo {
  const ic = one(lead.institute_contacts as Row | Row[]);
  const contact = one(ic?.contacts as Row | Row[]);
  const inst = one(ic?.institutes as Row | Row[]);
  const loc = one(inst?.locations as Row | Row[]);
  return {
    id: lead.id as string,
    lead_seq_id: lead.lead_seq_id as string,
    contactName: (contact?.name as string) || '',
    instituteName: (inst?.name as string) || '',
    district: (loc?.district as string) || '',
    phone: normalizePhone((contact?.mobile_no as string) || ''),
    status: lead.status as string,
  };
}

type Decision = { matchType?: 'phone_exact' | 'name_fuzzy'; lead?: LeadInfo };

/**
 * Validate all rows: field-level validation, within-file dedup, cross-DB dedup.
 *
 * One row = one book line. Rows sharing phone + visit date form one challan,
 * so they are NOT duplicates of each other — only an identical line
 * (same phone + date + book) is. The DB match is decided per phone, so every
 * line of a challan gets the same status. Only phones/districts present in
 * the file are queried, so this stays correct past PostgREST's 1000-row cap.
 */
export async function validateImportRows(rows: ImportRow[]): Promise<ImportValidationResult[]> {
  const supabase = await createClient();

  const agents = await fetchAll<{ name: string }>((f, t) => supabase.from('agents').select('name').eq('is_active', true).range(f, t));
  const activeAgentNames = new Set(agents.map(a => a.name.trim().toLowerCase()));

  // Resolve district from pincode for rows that don't carry one.
  const pincodes = [...new Set(rows.filter(r => !r.district && /^\d{6}$/.test(r.pincode)).map(r => r.pincode))];
  const pinToDistrict = new Map<string, string>();
  for (const part of chunk(pincodes, 200)) {
    const { data } = await supabase.from('locations').select('pincode, district').in('pincode', part);
    (data || []).forEach(l => { if (l.district) pinToDistrict.set(l.pincode, l.district); });
  }
  rows.forEach(r => { if (!r.district && pinToDistrict.has(r.pincode)) r.district = pinToDistrict.get(r.pincode); });

  // Exact phone matches — query only the phones in this file.
  const phones = [...new Set(rows.map(r => normalizePhone(r.phone)).filter(p => /^\d{10}$/.test(p)))];
  const phoneToLead = new Map<string, LeadInfo>();
  for (const part of chunk(phones, 200)) {
    const { data: contacts } = await supabase.from('contacts').select('id').in('mobile_no', part);
    for (const ids of chunk((contacts || []).map(c => c.id as string), 200)) {
      const { data: leads } = await supabase
        .from('leads')
        .select('id, lead_seq_id, status, created_at, institute_contacts!inner(contact_id, contacts(name, mobile_no), institutes(name, locations(district)))')
        .in('institute_contacts.contact_id', ids)
        .order('created_at', { ascending: true });
      // Ascending, so the most recent lead for a phone wins.
      (leads || []).forEach(l => {
        const info = toLeadInfo(l as Row);
        if (info.phone) phoneToLead.set(info.phone, info);
      });
    }
  }

  // Fuzzy name candidates — existing leads in the districts this file touches.
  const districts = [...new Set(rows.map(r => r.district).filter((d): d is string => !!d))];
  const districtLeads: LeadInfo[] = [];
  for (const part of chunk(districts, 50)) {
    const leads = await fetchAll<Row>((f, t) =>
      supabase
        .from('leads')
        .select('id, lead_seq_id, status, institute_contacts!inner(contacts(name, mobile_no), institutes!inner(name, locations!inner(district)))')
        .in('institute_contacts.institutes.locations.district', part)
        .range(f, t)
    );
    leads.forEach(l => districtLeads.push(toLeadInfo(l)));
  }

  // Phone-level decision, made once and shared by every line of that phone.
  const phoneDecision = new Map<string, Decision>();
  const decide = (row: ImportRow): Decision => {
    const cached = phoneDecision.get(row.phone);
    if (cached) return cached;
    let decision: Decision = {};
    const exact = phoneToLead.get(row.phone);
    if (exact) {
      decision = { matchType: 'phone_exact', lead: exact };
    } else {
      const fuzzy = districtLeads.find(l =>
        l.phone !== row.phone &&
        !!row.district && l.district.toLowerCase() === row.district.toLowerCase() &&
        isFuzzyMatch(l.contactName, row.leadName)
      );
      if (fuzzy) decision = { matchType: 'name_fuzzy', lead: fuzzy };
    }
    phoneDecision.set(row.phone, decision);
    return decision;
  };

  const results: ImportValidationResult[] = [];
  const lineSeen = new Set<string>();
  const matchedIds = new Set<string>();

  for (const row of rows) {
    row.phone = normalizePhone(row.phone);
    const errors = validateRow(row, activeAgentNames);
    if (errors.length > 0) {
      results.push({ row, status: 'error', errors });
      continue;
    }

    const lineKey = `${row.phone}|${row.visitDate}|${row.bookTitle.trim().toLowerCase()}`;
    if (lineSeen.has(lineKey)) {
      results.push({ row, status: 'duplicate', errors: [], matchType: 'within_file', action: 'skip' });
      continue;
    }
    lineSeen.add(lineKey);

    const decision = decide(row);
    if (decision.lead) {
      matchedIds.add(decision.lead.id);
      results.push({
        row,
        status: 'duplicate',
        errors: [],
        matchType: decision.matchType,
        existingLead: { ...decision.lead },
        // Same phone = same person on a new visit → attaching is the safe default.
        // A fuzzy name match must be decided by the operator.
        action: decision.matchType === 'phone_exact' ? 'attach_to_lead' : undefined,
      });
      continue;
    }

    results.push({ row, status: 'new', errors: [] });
  }

  // Last visit for every matched lead, for the side-by-side review.
  const leadLastChallan = new Map<string, { date: string; books: string[] }>();
  for (const part of chunk([...matchedIds], 100)) {
    const { data } = await supabase
      .from('challans')
      .select('lead_id, challan_date, challan_books(books(title))')
      .in('lead_id', part)
      .order('challan_date', { ascending: false });
    (data || []).forEach(c => {
      const leadId = c.lead_id as string;
      if (leadLastChallan.has(leadId)) return;
      const books = ((c.challan_books as Row[]) || [])
        .map(cb => one(cb.books as Row | Row[])?.title as string | undefined)
        .filter((t): t is string => !!t);
      leadLastChallan.set(leadId, { date: c.challan_date as string, books });
    });
  }
  results.forEach(r => {
    if (!r.existingLead) return;
    const last = leadLastChallan.get(r.existingLead.id);
    r.existingLead.lastVisitDate = last?.date;
    r.existingLead.lastChallanBooks = last?.books;
  });

  return results;
}


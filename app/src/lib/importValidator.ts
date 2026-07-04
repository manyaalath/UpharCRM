// ============================================================
// Uphar CRM — Import Validator
// Validates Excel import rows, detects duplicates (within-file + DB)
// ============================================================

import { createClient } from '@/lib/supabase/server';
import type { ImportRow, ImportValidationResult } from '@/lib/types';

const VALID_LEAD_TYPES = ['teacher', 'retail_salesperson', 'shopkeeper', 'institution'];
const LEAD_TYPE_MAP: Record<string, string> = {
  'teacher': 'teacher',
  'retail salesperson': 'retail_salesperson',
  'shopkeeper': 'shopkeeper',
  'institution': 'institution',
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
  const lower = input.toLowerCase().trim();
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
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;
  const dist = levenshtein(a, b);
  return dist / maxLen <= 0.2;
}

/**
 * Validate a single row for field-level errors.
 */
function validateRow(row: ImportRow, activeAgentNames: string[]): string[] {
  const errors: string[] = [];

  if (!row.leadName?.trim()) errors.push('Lead Name is required');
  if (!row.phone?.trim()) {
    errors.push('Phone Number is required');
  } else {
    const normalized = normalizePhone(row.phone);
    if (!/^\d{10}$/.test(normalized)) {
      errors.push('Phone Number must be a valid 10-digit Indian mobile number');
    }
  }
  if (!row.leadType?.trim()) {
    errors.push('Lead Type is required');
  } else {
    const normalized = normalizeLeadType(row.leadType);
    if (!normalized) {
      errors.push(`Lead Type must be one of: Teacher, Retail Salesperson, Shopkeeper, Institution`);
    }
  }
  if (!row.pincode?.trim()) {
    errors.push('Pincode is required');
  } else if (!/^\d{6}$/.test(row.pincode.trim())) {
    errors.push('Pincode must be exactly 6 digits');
  }
  if (!row.instituteName?.trim()) errors.push('School/Shop/Institution Name is required');
  if (!row.repName?.trim()) {
    errors.push('Rep Name is required');
  } else {
    // Check rep exists in active agents
    const repLower = row.repName.trim().toLowerCase();
    const found = activeAgentNames.some(a => a.toLowerCase() === repLower);
    if (!found) {
      errors.push(`Rep "${row.repName}" not found in active representatives`);
    }
  }
  if (!row.visitDate) {
    errors.push('Visit Date is required');
  } else {
    const d = new Date(row.visitDate);
    if (isNaN(d.getTime())) errors.push('Visit Date is not a valid date');
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

function parseDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'number') {
    // Excel serial date
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const d = new Date(String(value));
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return String(value);
}

/**
 * Validate all rows: field-level validation, within-file dedup, cross-DB dedup.
 */
export async function validateImportRows(rows: ImportRow[]): Promise<ImportValidationResult[]> {
  const supabase = await createClient();

  // Fetch all active agents
  const { data: agents } = await supabase
    .from('agents')
    .select('name')
    .eq('is_active', true);
  const activeAgentNames = (agents || []).map(a => a.name);

  // Fetch all existing contacts (phone → lead info) for dedup
  const { data: existingContacts } = await supabase
    .from('contacts')
    .select('id, name, mobile_no');

  // Fetch leads with their contact/institute/location info for dedup display
  const { data: existingLeads } = await supabase
    .from('leads')
    .select('id, lead_seq_id, status, institute_contacts!inner(contacts(name, mobile_no), institutes(name, locations(district)))');

  // Fetch recent challans for last visit info
  const { data: recentChallans } = await supabase
    .from('challans')
    .select('lead_id, challan_date, challan_books(books(title))')
    .order('challan_date', { ascending: false });

  // Build lookup maps
  const phoneToContacts = new Map<string, { id: string; name: string }>();
  (existingContacts || []).forEach(c => {
    phoneToContacts.set(normalizePhone(c.mobile_no), { id: c.id, name: c.name });
  });

  // Build phone → lead details map
  const phoneToLeadDetails = new Map<string, {
    id: string;
    lead_seq_id: string;
    contactName: string;
    instituteName: string;
    district: string;
    phone: string;
    status: string;
  }>();

  // Build name+district → lead details for fuzzy matching
  const nameDistrictLeads: Array<{
    name: string;
    district: string;
    leadId: string;
    leadSeqId: string;
    instituteName: string;
    phone: string;
    status: string;
  }> = [];

  (existingLeads || []).forEach((lead: Record<string, unknown>) => {
    const ic = lead.institute_contacts as Record<string, unknown>;
    const contacts = ic?.contacts as { name?: string; mobile_no?: string } | undefined;
    const institutes = ic?.institutes as { name?: string; locations?: { district?: string } } | undefined;

    const phone = normalizePhone(contacts?.mobile_no || '');
    const contactName = contacts?.name || '';
    const instituteName = institutes?.name || '';
    const district = institutes?.locations?.district || '';

    if (phone) {
      phoneToLeadDetails.set(phone, {
        id: lead.id as string,
        lead_seq_id: lead.lead_seq_id as string,
        contactName,
        instituteName,
        district,
        phone,
        status: lead.status as string,
      });
    }

    nameDistrictLeads.push({
      name: contactName,
      district,
      leadId: lead.id as string,
      leadSeqId: lead.lead_seq_id as string,
      instituteName,
      phone,
      status: lead.status as string,
    });
  });

  // Build lead → last challan info
  const leadLastChallan = new Map<string, { date: string; books: string[] }>();
  (recentChallans || []).forEach((c: Record<string, unknown>) => {
    const leadId = c.lead_id as string;
    if (!leadLastChallan.has(leadId)) {
      const books = ((c.challan_books as Array<{ books: { title: string } }>) || []).map(cb => cb.books?.title).filter(Boolean);
      leadLastChallan.set(leadId, { date: c.challan_date as string, books });
    }
  });

  // Track within-file duplicates
  const phoneSeenInFile = new Map<string, number>(); // phone → first row index

  const results: ImportValidationResult[] = [];

  for (const row of rows) {
    const errors = validateRow(row, activeAgentNames);
    const phone = normalizePhone(row.phone);

    // If field-level errors, mark as error
    if (errors.length > 0) {
      results.push({ row, status: 'error', errors });
      continue;
    }

    // Check within-file duplicate
    if (phoneSeenInFile.has(phone)) {
      results.push({
        row,
        status: 'duplicate',
        errors: [],
        matchType: 'within_file',
        existingLead: undefined,
      });
      continue;
    }
    phoneSeenInFile.set(phone, row.rowIndex);

    // Check exact phone match against DB
    const existingLead = phoneToLeadDetails.get(phone);
    if (existingLead) {
      const lastChallan = leadLastChallan.get(existingLead.id);
      results.push({
        row,
        status: 'duplicate',
        errors: [],
        matchType: 'phone_exact',
        existingLead: {
          ...existingLead,
          lastVisitDate: lastChallan?.date,
          lastChallanBooks: lastChallan?.books,
        },
        action: 'attach_to_lead', // Default suggestion
      });
      continue;
    }

    // Check fuzzy name + district match
    const fuzzyMatch = nameDistrictLeads.find(l =>
      isFuzzyMatch(l.name, row.leadName) &&
      ((l.district || '').toLowerCase() === (row.district || '').toLowerCase() || row.pincode === l.phone /* placeholder — actually match district */)
    );

    if (fuzzyMatch) {
      const lastChallan = leadLastChallan.get(fuzzyMatch.leadId);
      results.push({
        row,
        status: 'duplicate',
        errors: [],
        matchType: 'name_fuzzy',
        existingLead: {
          id: fuzzyMatch.leadId,
          lead_seq_id: fuzzyMatch.leadSeqId,
          contactName: fuzzyMatch.name,
          instituteName: fuzzyMatch.instituteName,
          district: fuzzyMatch.district,
          phone: fuzzyMatch.phone,
          lastVisitDate: lastChallan?.date,
          lastChallanBooks: lastChallan?.books,
          status: fuzzyMatch.status,
        },
      });
      continue;
    }

    // Check pincode → district auto-fill
    if (row.pincode && !row.district) {
      const { data: location } = await supabase
        .from('locations')
        .select('district')
        .eq('pincode', row.pincode)
        .single();
      if (location) {
        row.district = location.district;
      }
    }

    // No match — new lead
    results.push({ row, status: 'new', errors: [] });
  }

  return results;
}

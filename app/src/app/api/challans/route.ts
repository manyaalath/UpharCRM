import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { triggerLeadWhatsApp } from '@/lib/whatsapp/service';
import { validateChallan } from '@/lib/validators';
import { applyBookQuantities, findLeadByMobile, normalizeSpecimens } from './challanService';

const NO_MATCH_ID = '00000000-0000-0000-0000-000000000000';

// GET /api/challans
//   ?lookup=mobile&mobile=9876543210     → existing lead for this phone (inline duplicate check)
//   ?lookup=pincode&pincode=800001       → { district, state } from known locations
//   ?lookup=challan_no&challan_no=1234   → { exists }
//   otherwise a paginated list with filters: district, agent_name, date_start, date_end, book, challan
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const lookup = searchParams.get('lookup');
  if (lookup === 'mobile') {
    const mobile = (searchParams.get('mobile') || '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(mobile)) return NextResponse.json({ error: 'mobile must be 10 digits' }, { status: 422 });
    return NextResponse.json({ data: await findLeadByMobile(supabase, mobile) });
  }
  if (lookup === 'pincode') {
    const pincode = searchParams.get('pincode') || '';
    if (!/^\d{6}$/.test(pincode)) return NextResponse.json({ error: 'pincode must be 6 digits' }, { status: 422 });
    const { data } = await supabase.from('locations').select('district, state').eq('pincode', pincode).limit(1);
    return NextResponse.json({ data: data?.[0] ?? null });
  }
  if (lookup === 'challan_no') {
    const no = (searchParams.get('challan_no') || '').trim();
    if (!no) return NextResponse.json({ data: { exists: false } });
    const { data } = await supabase.from('challans').select('id').eq('challan_no', no).limit(1);
    return NextResponse.json({ data: { exists: !!data?.length } });
  }

  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '20') || 20));
  const offset = (page - 1) * limit;
  const requestedDistrict = searchParams.get('district');

  let query = requestedDistrict
    ? supabase
        .from('challans')
        .select('*, leads!inner(institute_contacts!inner(contacts(name, mobile_no), institutes!inner(name, address_line, village_town, locality, locations!inner(district, state, pincode)))), agents(name)', { count: 'exact' })
        .eq('leads.institute_contacts.institutes.locations.district', requestedDistrict)
    : supabase
        .from('challans')
        .select('*, leads(lead_seq_id, institute_contacts(contacts(*), institutes(*, locations(*)))), agents(name)', { count: 'exact' });

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  // Rep filter: filtering on an embedded resource without !inner does not
  // filter parent rows, so resolve the name to an id first.
  const agentName = searchParams.get('agent_name');
  if (agentName) {
    const { data: agent } = await supabase.from('agents').select('id').eq('name', agentName).limit(1);
    query = query.eq('agent_id', agent?.[0]?.id ?? NO_MATCH_ID);
  }

  const challanSearch = searchParams.get('challan')?.trim();
  if (challanSearch) query = query.ilike('challan_no', `%${challanSearch.replace(/[%_]/g, '')}%`);

  if (searchParams.has('date_start')) query = query.gte('challan_date', searchParams.get('date_start'));
  if (searchParams.has('date_end')) query = query.lte('challan_date', searchParams.get('date_end'));

  const book = searchParams.get('book');
  if (book) {
    const { data: cb } = await supabase.from('challan_books').select('challan_id, books!inner(title)').eq('books.title', book);
    const ids = (cb || []).map(c => c.challan_id);
    query = query.in('id', ids.length ? ids : [NO_MATCH_ID]);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: { page, limit, total: count, total_pages: count ? Math.ceil(count / limit) : 0 },
  });
}

// POST /api/challans — create a challan (and lead if needed).
// Body: challan fields + specimens_given: string[] | { title, quantity }[]
// If the mobile already belongs to a lead and no confirm_action is given,
// responds { duplicate_found, existing_lead } so the operator can choose.
export async function POST(request: Request) {
  const supabase = await createClient();
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  body.mobile_no = String(body.mobile_no || '').replace(/\D/g, '');
  body.challan_no = String(body.challan_no || '').trim();
  const specimens = normalizeSpecimens(body.specimens_given);
  body.specimens_given = specimens;

  const validation = validateChallan(body);
  if (!validation.valid) {
    return NextResponse.json({ error: 'Please fix the highlighted fields', fields: validation.fields }, { status: 422 });
  }

  const { data: existingChallan } = await supabase.from('challans').select('id').eq('challan_no', body.challan_no).limit(1);
  if (existingChallan?.length) {
    return NextResponse.json(
      { error: `Challan number ${body.challan_no} already exists`, fields: { challan_no: 'Already entered' } },
      { status: 409 }
    );
  }

  const confirmAction: string | undefined = body.confirm_action;
  if (confirmAction && !['attach_to_lead', 'create_new'].includes(confirmAction)) {
    return NextResponse.json({ error: 'Invalid confirm_action' }, { status: 422 });
  }
  if (confirmAction === 'attach_to_lead' && !body.existing_lead_id) {
    return NextResponse.json({ error: 'existing_lead_id is required to attach' }, { status: 422 });
  }

  if (!confirmAction) {
    const existing = await findLeadByMobile(supabase, body.mobile_no);
    if (existing) {
      return NextResponse.json({ duplicate_found: true, match_type: 'mobile', existing_lead: existing });
    }
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc('create_challan_transaction', {
    p_agent_name: body.agent_name || null,
    p_pincode: body.pincode || null,
    p_district: body.district || null,
    p_state: body.state || null,
    p_contact_name: body.teacher_name || 'Unknown',
    p_mobile_no: body.mobile_no,
    p_institute_name: body.institute_name,
    p_address_line: body.address || null,
    p_village_town: body.village_town || null,
    p_locality: body.locality || null,
    p_challan_no: body.challan_no,
    p_challan_date: body.challan_date,
    p_specimens: specimens.map(s => s.title),
    p_confirm_action: confirmAction || null,
    p_existing_lead_id: confirmAction === 'attach_to_lead' ? body.existing_lead_id : null,
    p_lead_type: body.lead_type || null,
  });

  const failure = rpcError ? { code: rpcError.code, message: rpcError.message } : rpcResult && !rpcResult.success ? { code: rpcResult.detail, message: rpcResult.error } : null;
  if (failure) {
    if (failure.code === '23505') {
      return NextResponse.json(
        { error: `Challan number ${body.challan_no} already exists`, fields: { challan_no: 'Already entered' } },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: failure.message || 'Transaction failed' }, { status: 500 });
  }

  const challanId: string | undefined = rpcResult?.challan_id;
  const leadId: string | undefined = rpcResult?.lead_id;

  if (challanId) await applyBookQuantities(supabase, challanId, specimens);

  let leadSeqId: string | null = null;
  if (leadId) {
    const { data: lead } = await supabase.from('leads').select('lead_seq_id').eq('id', leadId).maybeSingle();
    leadSeqId = lead?.lead_seq_id ?? null;
    // Best-effort, idempotent, stub-safe. Never fail the save on a messaging hiccup.
    try {
      await triggerLeadWhatsApp(leadId);
    } catch (e) {
      console.error('WhatsApp trigger failed:', e);
    }
  }

  return NextResponse.json({ success: true, challan_id: challanId, lead_id: leadId, lead_seq_id: leadSeqId });
}

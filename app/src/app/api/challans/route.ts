import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getUserContext, getDistrictFilter } from '@/lib/rbac';

export async function GET(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  // Determine if we need district filtering
  const districtFilter = getDistrictFilter(ctx);
  const requestedDistrict = searchParams.get('district');

  // Check permission for explicit district requests
  if (requestedDistrict && districtFilter && !districtFilter.includes(requestedDistrict)) {
    return NextResponse.json({ error: 'Access denied to this district' }, { status: 403 });
  }

  // Manager/telecaller with no assigned districts — return empty
  if (districtFilter && districtFilter.length === 0) {
    return NextResponse.json({
      data: [],
      pagination: { page, limit, total: 0, total_pages: 0 }
    });
  }

  let query;

  if (requestedDistrict || (districtFilter && districtFilter.length > 0)) {
    // Need inner joins for district filtering
    query = supabase
      .from('challans')
      .select('*, leads!inner(institute_contacts!inner(contacts(name, mobile_no), institutes!inner(name, address_line, village_town, locality, locations!inner(district, state, pincode)))), agents(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (requestedDistrict) {
      query = query.eq('leads.institute_contacts.institutes.locations.district', requestedDistrict);
    } else if (districtFilter && districtFilter.length > 0) {
      query = query.in('leads.institute_contacts.institutes.locations.district', districtFilter);
    }
  } else {
    // No district filter — full access
    query = supabase
      .from('challans')
      .select('*, leads(institute_contacts(contacts(*), institutes(*, locations(*)))), agents(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
  }

  // Agent filter
  if (searchParams.has('agent_name')) {
    query = query.eq('agents.name', searchParams.get('agent_name'));
  }

  // Date filters
  if (searchParams.has('date_start')) query = query.gte('challan_date', searchParams.get('date_start'));
  if (searchParams.has('date_end')) query = query.lte('challan_date', searchParams.get('date_end'));
  
  // Book filter
  if (searchParams.has('book')) {
    const { data: cb } = await supabase.from('challan_books').select('challan_id, books!inner(title)').eq('books.title', searchParams.get('book'));
    if (cb && cb.length > 0) {
      const challanIds = cb.map(c => c.challan_id);
      query = query.in('id', challanIds);
    } else {
      query = query.in('id', ['00000000-0000-0000-0000-000000000000']);
    }
  }

  const { data, count, error } = await query;

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      total_pages: count ? Math.ceil(count / limit) : 0
    }
  });
}

export async function POST(request: Request) {
  const ctx = await getUserContext(request);
  if (!ctx) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Only data_entry, manager, admin can create challans
  if (!['data_entry', 'manager', 'admin'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Insufficient permissions to create challans' }, { status: 403 });
  }

  const supabase = await createClient();
  const body = await request.json();

  // Basic validation
  if (!body.challan_no || !body.mobile_no || !body.institute_name || !body.teacher_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 422 });
  }

  // Check for duplicate challan_no first
  const { data: existingChallan } = await supabase.from('challans').select('id').eq('challan_no', body.challan_no).single();
  if (existingChallan) {
    return NextResponse.json({ error: `Challan number ${body.challan_no} already exists` }, { status: 409 });
  }

  const confirmAction = body.confirm_action;
  const existingLeadId = body.existing_lead_id;

  // ── 1. Check for duplicates ──
  if (!confirmAction) {
    const { data: contact } = await supabase.from('contacts').select('id').eq('mobile_no', body.mobile_no).single();
    if (contact) {
      const { data: leads } = await supabase
        .from('leads')
        .select('*, institute_contacts!inner(contacts(name, mobile_no), institutes(name, locations(district)))')
        .eq('institute_contacts.contact_id', contact.id)
        .limit(1);

      if (leads && leads.length > 0) {
        const lead = leads[0];
        const instContact = Array.isArray(lead.institute_contacts) ? lead.institute_contacts[0] : lead.institute_contacts;
        
        return NextResponse.json({
          duplicate_found: true,
          match_type: 'mobile',
          existing_lead: {
            id: lead.id,
            lead_id: lead.lead_seq_id,
            contact_person: (instContact as Record<string, unknown> & { contacts?: { name?: string } }).contacts?.name,
            institute_name: (instContact as Record<string, unknown> & { institutes?: { name?: string } }).institutes?.name,
            district: (instContact as Record<string, unknown> & { institutes?: { locations?: { district?: string } } }).institutes?.locations?.district,
            mobile_no: (instContact as Record<string, unknown> & { contacts?: { mobile_no?: string } }).contacts?.mobile_no,
            status: lead.status
          }
        });
      }
    }
  }

  // ── 2. Atomic Transaction via Postgres RPC ──
  const rpcPayload = {
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
    p_specimens: body.specimens_given || [],
    p_confirm_action: confirmAction || null,
    p_existing_lead_id: existingLeadId || null,
    p_lead_type: body.lead_type || null,
  };

  const { data: rpcResult, error: rpcError } = await supabase.rpc('create_challan_transaction', rpcPayload);

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  if (rpcResult && !rpcResult.success) {
    return NextResponse.json({ error: rpcResult.error || 'Transaction failed', detail: rpcResult.detail }, { status: 500 });
  }

  return NextResponse.json({ success: true, challan_id: rpcResult?.challan_id });
}

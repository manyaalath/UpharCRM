import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { validateChallan } from '@/lib/validators';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('challans')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (searchParams.has('district')) query = query.eq('district', searchParams.get('district'));
  if (searchParams.has('agent_name')) query = query.eq('agent_name', searchParams.get('agent_name'));
  if (searchParams.has('search')) {
    const s = searchParams.get('search');
    query = query.or(`challan_no.ilike.%${s}%,teacher_name.ilike.%${s}%,institute_name.ilike.%${s}%,mobile_no.ilike.%${s}%`);
  }

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
  const supabase = await createClient();
  const body = await request.json();

  const validation = validateChallan(body);
  if (!validation.valid) {
    return NextResponse.json({ error: 'Validation failed', fields: validation.fields }, { status: 422 });
  }

  // Check for duplicate challan_no first
  const { data: existingChallan } = await supabase
    .from('challans')
    .select('id')
    .eq('challan_no', body.challan_no)
    .single();

  if (existingChallan) {
    return NextResponse.json({ error: `Challan number ${body.challan_no} already exists` }, { status: 409 });
  }

  // ── Duplicate Contact Detection ──
  // If no confirm_action provided, check for duplicates first
  const confirmAction = body.confirm_action; // 'attach_to_lead' | 'create_new' | undefined
  const existingLeadId = body.existing_lead_id; // UUID of existing lead to attach to

  if (!confirmAction) {
    // Check for existing lead by mobile number (primary)
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('mobile_no', body.mobile_no)
      .limit(1)
      .single();

    if (existingLead) {
      return NextResponse.json({
        duplicate_found: true,
        existing_lead: existingLead,
        match_type: 'mobile',
      });
    }

    // Secondary check: name + institute + district
    if (body.teacher_name && body.institute_name && body.district) {
      const { data: secondaryMatches } = await supabase
        .from('leads')
        .select('*')
        .ilike('contact_person', `%${body.teacher_name}%`)
        .eq('district', body.district)
        .limit(1);

      if (secondaryMatches && secondaryMatches.length > 0) {
        return NextResponse.json({
          duplicate_found: true,
          existing_lead: secondaryMatches[0],
          match_type: 'secondary',
        });
      }
    }
  }

  // ── Create or attach based on confirm_action ──
  let leadId: string | null = null;

  if (confirmAction === 'attach_to_lead' && existingLeadId) {
    // Attach to existing lead
    leadId = existingLeadId;
  } else {
    // Create a new lead (either confirm_action === 'create_new' or no duplicates found)
    const { data: leadCountData } = await supabase.from('leads').select('id', { count: 'exact', head: true });
    const leadCount = (leadCountData as unknown as number) || 0;

    // Get actual count for lead_id generation
    const { count: actualCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
    const nextLeadId = 'L' + String((actualCount || 0) + 1).padStart(4, '0');

    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert([{
        lead_id: nextLeadId,
        contact_person: body.teacher_name,
        institute_name: body.institute_name,
        mobile_no: body.mobile_no,
        address: body.address,
        village_town: body.village_town || null,
        locality: body.locality || null,
        district: body.district,
        pincode: body.pincode,
        agent_name: body.agent_name,
        status: 'new',
      }])
      .select('id, lead_id')
      .single();

    if (leadError) {
      return NextResponse.json({ error: 'Failed to create lead: ' + leadError.message }, { status: 500 });
    }

    leadId = newLead.id;

    // Log activity: lead created
    await supabase.from('lead_activities').insert([{
      lead_id: leadId,
      activity_type: 'lead_created',
      description: `Lead created from Challan ${body.challan_no}`,
      metadata: { challan_no: body.challan_no },
    }]);
  }

  // ── Insert the challan ──
  const challanData = {
    challan_no: body.challan_no,
    challan_date: body.challan_date,
    teacher_name: body.teacher_name,
    institute_name: body.institute_name,
    address: body.address,
    village_town: body.village_town || null,
    locality: body.locality || null,
    district: body.district,
    pincode: body.pincode,
    mobile_no: body.mobile_no,
    specimens_given: body.specimens_given,
    agent_name: body.agent_name,
    lead_id: leadId,
  };

  const { data, error } = await supabase
    .from('challans')
    .insert([challanData])
    .select('id, challan_no')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Log activity: specimen distributed ──
  if (leadId) {
    await supabase.from('lead_activities').insert([{
      lead_id: leadId,
      activity_type: confirmAction === 'attach_to_lead' ? 'additional_specimen' : 'specimen_distributed',
      description: `Specimens distributed: ${(body.specimens_given as string[]).join(', ')}`,
      metadata: { challan_no: body.challan_no, specimens: body.specimens_given },
    }]);

    // If attaching to existing lead, also log the attachment
    if (confirmAction === 'attach_to_lead') {
      await supabase.from('lead_activities').insert([{
        lead_id: leadId,
        activity_type: 'challan_attached',
        description: `Challan ${body.challan_no} attached to existing lead`,
        metadata: { challan_no: body.challan_no },
      }]);
    }

    // ── Auto-create follow-up (15 days from challan date) ──
    const challanDateObj = new Date(body.challan_date);
    const followupDate = new Date(challanDateObj);
    followupDate.setDate(followupDate.getDate() + 15);

    await supabase.from('follow_ups').insert([{
      lead_id: leadId,
      challan_id: data.id,
      challan_no: body.challan_no,
      assigned_rep: body.agent_name,
      followup_date: followupDate.toISOString().split('T')[0],
      status: 'pending',
      remarks: 'Auto-created on challan entry',
    }]);

    // Log follow-up creation activity
    await supabase.from('lead_activities').insert([{
      lead_id: leadId,
      activity_type: 'followup_created',
      description: `Follow-up scheduled for ${followupDate.toISOString().split('T')[0]}`,
      metadata: { followup_date: followupDate.toISOString().split('T')[0] },
    }]);
  }

  return NextResponse.json({
    id: data.id,
    challan_no: data.challan_no,
    lead_id: leadId,
    message: 'Challan created successfully'
  }, { status: 201 });
}

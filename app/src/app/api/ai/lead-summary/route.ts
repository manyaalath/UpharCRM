import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import groq, { AI_MODEL } from '@/lib/ai/groqClient';
import { BASE_SYSTEM_PROMPT, LEAD_INTELLIGENCE_PROMPT } from '@/lib/ai/prompts';

export async function POST(request: Request) {
  try {
    const { lead_id } = await request.json();
    if (!lead_id) return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });

    const supabase = await createClient();

    // 1. Fetch Lead & Institute Details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select(`
        id, lead_seq_id, status, created_at,
        institute_contacts (
          contacts (name, mobile_no),
          institutes (name, address_line, village_town, locality, locations(district, state, pincode))
        ),
        agents (name)
      `)
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) throw new Error('Failed to fetch lead');

    // 2. Fetch Follow-ups (Interaction History & Feedback)
    const { data: followUps } = await supabase
      .from('follow_ups')
      .select('followup_date, status, remarks, is_physical_visit, call_outcome, updated_at, agents(name)')
      .eq('lead_id', lead_id)
      .order('followup_date', { ascending: false });

    // 3. Fetch Challans (Books Distributed)
    const { data: challans } = await supabase
      .from('challans')
      .select('id, challan_date, challan_no, challan_books(quantity, books(title))')
      .eq('lead_id', lead_id);

    // Flatten nested relationships for the AI context to save tokens
    const instContact = Array.isArray(lead.institute_contacts) ? lead.institute_contacts[0] : lead.institute_contacts;
    
    const books_distributed = challans?.flatMap(c => 
      c.challan_books?.map((cb: any) => `${cb.quantity}x ${cb.books?.title}`)
    ) || [];

    const aiContext = {
      lead_info: {
        id: lead.lead_seq_id,
        status: lead.status,
        agent_assigned: (lead.agents as any)?.name || 'Unassigned',
        created_at: lead.created_at
      },
      contact_info: {
        person: (instContact as any)?.contacts?.name,
        institute: (instContact as any)?.institutes?.name,
        district: (instContact as any)?.institutes?.locations?.district
      },
      books_distributed: books_distributed,
      total_challans: challans?.length || 0,
      interaction_history: followUps?.map(f => ({
        date: f.followup_date,
        status: f.status,
        remarks: f.remarks,
        type: f.is_physical_visit ? 'Physical Visit' : 'Call',
        call_outcome: f.call_outcome,
        agent: (f.agents as any)?.name || 'Unknown'
      })) || []
    };

    // Call Groq AI
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        { role: 'system', content: LEAD_INTELLIGENCE_PROMPT },
        { role: 'user', content: JSON.stringify(aiContext) }
      ],
      model: AI_MODEL,
      temperature: 0.2, // Low temperature for analytical consistency
      response_format: { type: "json_object" }
    });

    const aiResponseContent = completion.choices[0]?.message?.content;
    if (!aiResponseContent) throw new Error('AI returned empty response');

    const parsedResponse = JSON.parse(aiResponseContent);

    return NextResponse.json({ data: parsedResponse });

  } catch (error: any) {
    console.error('AI API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import groq, { AI_MODEL } from '@/lib/ai/groqClient';
import { BASE_SYSTEM_PROMPT, LEAD_INTELLIGENCE_PROMPT } from '@/lib/ai/prompts';
import { todayIST } from '@/lib/date';

const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

type Named = { name?: string } | null;

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'AI summaries are not set up yet. Add GROQ_API_KEY to the server environment.', code: 'ai_not_configured' },
      { status: 503 }
    );
  }

  try {
    const { lead_id } = await request.json().catch(() => ({}));
    if (!lead_id) return NextResponse.json({ error: 'lead_id is required' }, { status: 400 });

    const supabase = await createClient();

    const [leadRes, followUpsRes, callsRes, challansRes] = await Promise.all([
      supabase
        .from('leads')
        .select(`
          id, lead_seq_id, status, lead_type, created_at, last_contact_date,
          institute_contacts (
            contacts (name),
            institutes (name, village_town, locations(district))
          ),
          agents (name)
        `)
        .eq('id', lead_id)
        .maybeSingle(),
      // follow_ups columns: followup_date, status, remarks, updated_at (no call outcome here)
      supabase
        .from('follow_ups')
        .select('followup_date, status, remarks, updated_at, agents(name)')
        .eq('lead_id', lead_id)
        .order('followup_date', { ascending: false }),
      // Call outcomes live in call_feedback.
      supabase
        .from('call_feedback')
        .select('call_outcome, suggestions, complaints, remarks, created_at')
        .eq('lead_id', lead_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('challans')
        .select('challan_date, challan_no, challan_books(quantity, books(title))')
        .eq('lead_id', lead_id)
        .order('challan_date', { ascending: false }),
    ]);

    const queryError = leadRes.error || followUpsRes.error || callsRes.error || challansRes.error;
    if (queryError) {
      console.error('Lead summary query failed:', queryError);
      return NextResponse.json({ error: `Could not load lead history: ${queryError.message}` }, { status: 500 });
    }
    const lead = leadRes.data;
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const ic = one(lead.institute_contacts as unknown as Record<string, unknown> | Record<string, unknown>[]);
    const contact = one(ic?.contacts as Named | Named[]);
    const institute = one(ic?.institutes as { name?: string; village_town?: string; locations?: { district?: string } | { district?: string }[] } | null);

    // Compact context to keep tokens low.
    const aiContext = {
      today: todayIST(),
      lead: {
        id: lead.lead_seq_id,
        status: lead.status,
        type: lead.lead_type,
        rep: one(lead.agents as unknown as Named | Named[])?.name || 'Unassigned',
        created: lead.created_at?.slice(0, 10),
        last_contact: lead.last_contact_date,
      },
      contact: {
        person: contact?.name,
        institute: institute?.name,
        town: institute?.village_town,
        district: one(institute?.locations)?.district,
      },
      specimen_visits: (challansRes.data || []).map(c => ({
        date: c.challan_date,
        books: ((c.challan_books || []) as unknown as { quantity: number; books: { title: string } | { title: string }[] | null }[])
          .map(cb => `${cb.quantity || 1}x ${one(cb.books)?.title}`),
      })),
      calls: (callsRes.data || []).map(c => ({
        date: c.created_at?.slice(0, 10),
        outcome: c.call_outcome,
        suggestion: c.suggestions || undefined,
        complaint: c.complaints || undefined,
        remarks: c.remarks || undefined,
      })),
      follow_ups: (followUpsRes.data || []).map(f => ({
        due: f.followup_date,
        status: f.status,
        remarks: f.remarks || undefined,
        rep: one(f.agents as unknown as Named | Named[])?.name,
      })),
    };

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        { role: 'system', content: LEAD_INTELLIGENCE_PROMPT },
        { role: 'user', content: JSON.stringify(aiContext) },
      ],
      model: AI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('AI returned an empty response');

    return NextResponse.json({ data: JSON.parse(content), generated_at: new Date().toISOString() });
  } catch (error) {
    console.error('AI lead summary error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

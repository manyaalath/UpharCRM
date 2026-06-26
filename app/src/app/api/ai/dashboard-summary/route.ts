import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import groq, { AI_MODEL } from '@/lib/ai/groqClient';
import { BASE_SYSTEM_PROMPT, DASHBOARD_SUMMARY_PROMPT } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createClient();

    // 1. Gather high-level stats for context
    const [
      { count: totalChallans },
      { count: totalLeads },
      { count: pendingFollowups },
      { data: districtStats },
      { data: bookStats },
      { data: overdueFollowups }
    ] = await Promise.all([
      supabase.from('challans').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('*', { count: 'exact', head: true }),
      supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('mv_district_stats').select('*').order('total_leads', { ascending: false }).limit(10),
      supabase.from('mv_book_stats').select('*').order('total_distributed', { ascending: false }).limit(10),
      supabase.from('follow_ups').select('id').eq('status', 'overdue')
    ]);

    const aiContext = {
      global_metrics: {
        total_challans: totalChallans || 0,
        total_leads: totalLeads || 0,
        pending_followups: pendingFollowups || 0,
        overdue_followups: overdueFollowups?.length || 0
      },
      top_districts: districtStats || [],
      top_books: bookStats || []
    };

    // 2. Call Groq AI
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        { role: 'system', content: DASHBOARD_SUMMARY_PROMPT },
        { role: 'user', content: JSON.stringify(aiContext) }
      ],
      model: AI_MODEL,
      temperature: 0.3, 
      response_format: { type: "json_object" }
    });

    const aiResponseContent = completion.choices[0]?.message?.content;
    if (!aiResponseContent) throw new Error('AI returned empty response');

    const parsedResponse = JSON.parse(aiResponseContent);

    return NextResponse.json({ data: parsedResponse });

  } catch (error: any) {
    console.error('Dashboard AI API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import groq, { AI_MODEL } from '@/lib/ai/groqClient';
import { BASE_SYSTEM_PROMPT, DAILY_BRIEF_PROMPT } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Follow-ups
    const { data: followUpsDueToday } = await supabase
      .from('follow_ups')
      .select('id, remarks, agents(name)')
      .eq('followup_date', today)
      .in('status', ['pending', 'overdue']);

    const { data: overdueFollowUps } = await supabase
      .from('follow_ups')
      .select('id, followup_date, remarks, agents(name)')
      .lt('followup_date', today)
      .in('status', ['pending', 'overdue']);

    // 2. Representative Workloads
    const { data: agents } = await supabase.from('agents').select('id, name');
    const { data: pendingFollowUpsCount } = await supabase.from('follow_ups').select('agent_id', { count: 'exact' }).eq('status', 'pending');
    
    // Aggregate workload per rep manually for context
    const repWorkloads = agents?.map(a => {
      const pendingCount = pendingFollowUpsCount?.filter(f => f.agent_id === a.id).length || 0;
      return { name: a.name, pending_tasks: pendingCount };
    }) || [];

    // 3. Stale Leads (no updates in 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: staleLeads } = await supabase
      .from('leads')
      .select('id, lead_seq_id, status, updated_at')
      .lt('updated_at', thirtyDaysAgo.toISOString())
      .limit(20);

    const aiContext = {
      date: today,
      follow_ups_due_today: followUpsDueToday?.length || 0,
      overdue_follow_ups: overdueFollowUps?.length || 0,
      overdue_details: overdueFollowUps?.slice(0, 10), // Give sample to AI
      rep_workloads: repWorkloads,
      stale_leads_count: staleLeads?.length || 0
    };

    // 4. Call Groq AI
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        { role: 'system', content: DAILY_BRIEF_PROMPT },
        { role: 'user', content: JSON.stringify(aiContext) }
      ],
      model: AI_MODEL,
      temperature: 0.4, 
      response_format: { type: "json_object" }
    });

    const aiResponseContent = completion.choices[0]?.message?.content;
    if (!aiResponseContent) throw new Error('AI returned empty response');

    const parsedResponse = JSON.parse(aiResponseContent);

    return NextResponse.json({ data: parsedResponse });

  } catch (error) {
    console.error('Daily Brief AI API Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

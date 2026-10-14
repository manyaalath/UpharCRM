import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import groq, { AI_MODEL } from '@/lib/ai/groqClient';
import { BASE_SYSTEM_PROMPT, DAILY_BRIEF_PROMPT } from '@/lib/ai/prompts';
import { addDaysIST, todayIST } from '@/lib/date';

export const dynamic = 'force-dynamic';

const OPEN = ['pending', 'overdue'];
const one = <T,>(v: unknown): T | undefined => (Array.isArray(v) ? v[0] : v) as T | undefined;

export async function POST() {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'AI is not configured — add GROQ_API_KEY to the environment.', code: 'ai_not_configured' },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const today = todayIST();
    const staleCutoff = new Date(`${addDaysIST(-30, today)}T00:00:00+05:30`).toISOString();
    const head = { count: 'exact' as const, head: true };

    const [dueToday, overdue, upcomingWeek, staleCount, overdueSample, staleSample, agentsRes] = await Promise.all([
      supabase.from('follow_ups').select('id', head).eq('followup_date', today).in('status', OPEN),
      supabase.from('follow_ups').select('id', head).lt('followup_date', today).in('status', OPEN),
      supabase.from('follow_ups').select('id', head).gt('followup_date', today).lte('followup_date', addDaysIST(7, today)).in('status', OPEN),
      supabase.from('leads').select('id', head).lt('updated_at', staleCutoff).not('status', 'in', '(closed,not_interested)'),
      supabase
        .from('follow_ups')
        .select('followup_date, remarks, agents(name), leads:lead_id(lead_seq_id, institute_contacts(contacts(name), institutes(name, locations(district))))')
        .lt('followup_date', today)
        .in('status', OPEN)
        .order('followup_date', { ascending: true })
        .limit(10),
      supabase
        .from('leads')
        .select('lead_seq_id, status, updated_at, institute_contacts(institutes(name, locations(district)))')
        .lt('updated_at', staleCutoff)
        .not('status', 'in', '(closed,not_interested)')
        .order('updated_at', { ascending: true })
        .limit(10),
      supabase.from('agents').select('id, name').eq('is_active', true).order('name'),
    ]);

    // Open follow-ups per rep — one count per rep so the numbers are exact.
    const agents = agentsRes.data || [];
    const workloads = await Promise.all(
      agents.map(async a => {
        const [open, late] = await Promise.all([
          supabase.from('follow_ups').select('id', head).eq('agent_id', a.id).in('status', OPEN),
          supabase.from('follow_ups').select('id', head).eq('agent_id', a.id).lt('followup_date', today).in('status', OPEN),
        ]);
        return { name: a.name, open_follow_ups: open.count || 0, overdue_follow_ups: late.count || 0 };
      })
    );

    const aiContext = {
      date: today,
      follow_ups_due_today: dueToday.count || 0,
      overdue_follow_ups: overdue.count || 0,
      follow_ups_next_7_days: upcomingWeek.count || 0,
      oldest_overdue: (overdueSample.data || []).map(f => {
        const lead = one<Record<string, unknown>>(f.leads);
        const ic = one<Record<string, unknown>>(lead?.institute_contacts);
        const inst = one<{ name?: string; locations?: unknown }>(ic?.institutes);
        return {
          due: f.followup_date,
          lead_id: lead?.lead_seq_id,
          contact: one<{ name?: string }>(ic?.contacts)?.name,
          institute: inst?.name,
          district: one<{ district?: string }>(inst?.locations)?.district,
          rep: one<{ name?: string }>(f.agents)?.name || 'Unassigned',
          remarks: f.remarks,
        };
      }),
      rep_workloads: workloads,
      stale_leads_count: staleCount.count || 0,
      stale_leads_sample: (staleSample.data || []).map(l => {
        const ic = one<Record<string, unknown>>(l.institute_contacts);
        const inst = one<{ name?: string; locations?: unknown }>(ic?.institutes);
        return {
          lead_id: l.lead_seq_id,
          status: l.status,
          last_updated: l.updated_at?.slice(0, 10),
          institute: inst?.name,
          district: one<{ district?: string }>(inst?.locations)?.district,
        };
      }),
    };

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        { role: 'system', content: DAILY_BRIEF_PROMPT },
        { role: 'user', content: JSON.stringify(aiContext) },
      ],
      model: AI_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('AI returned an empty response');

    return NextResponse.json({
      data: JSON.parse(content),
      // Real numbers, shown next to the AI text so nothing depends on the model quoting them right.
      facts: {
        due_today: aiContext.follow_ups_due_today,
        overdue: aiContext.overdue_follow_ups,
        next_7_days: aiContext.follow_ups_next_7_days,
        stale_leads: aiContext.stale_leads_count,
        reps: workloads,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Daily Brief AI API Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

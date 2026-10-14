import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import groq, { AI_MODEL } from '@/lib/ai/groqClient';
import { BASE_SYSTEM_PROMPT, DASHBOARD_SUMMARY_PROMPT } from '@/lib/ai/prompts';
import { computeAnalytics, filtersFromParams } from '@/app/api/dashboard/analytics';

export const dynamic = 'force-dynamic';

// POST /api/ai/dashboard-summary?from=&to=&district= — summary of the same live
// numbers the dashboard shows (not the stale materialized views).
export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'AI summaries are not configured on this server (GROQ_API_KEY is missing).', code: 'ai_not_configured' },
      { status: 503 }
    );
  }

  try {
    const supabase = await createClient();
    const a = await computeAnalytics(supabase, filtersFromParams(new URL(request.url).searchParams));

    const aiContext = {
      period: a.range.from ? `${a.range.from} to ${a.range.to}` : 'all time',
      district_filter: a.district || 'all districts',
      metrics: {
        challans: a.summary.challans,
        leads: a.summary.leads,
        books_distributed: a.summary.books,
        pending_followups: a.summary.pending_followups,
        overdue_followups: a.summary.overdue_followups,
        districts_covered: a.summary.districts_covered,
      },
      top_districts: a.districts.slice(0, 10),
      top_books: a.books.slice(0, 10),
      reps: a.reps.slice(0, 15),
      lead_status: a.lead_status,
    };

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: BASE_SYSTEM_PROMPT },
        { role: 'system', content: DASHBOARD_SUMMARY_PROMPT },
        { role: 'user', content: JSON.stringify(aiContext) },
      ],
      model: AI_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('AI returned an empty response');

    return NextResponse.json({ data: JSON.parse(content), generated_at: new Date().toISOString() });
  } catch (error) {
    console.error('Dashboard AI API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

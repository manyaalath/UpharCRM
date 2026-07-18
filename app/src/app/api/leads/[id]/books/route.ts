import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const supabase = await createClient();

  // Fetch all challans for this lead, with their books
  const { data: challans, error } = await supabase
    .from('challans')
    .select('id, challan_no, challan_date, challan_books(quantity, books(id, title))')
    .eq('lead_id', leadId)
    .order('challan_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate books across all challans
  const bookMap = new Map<string, { id: string; title: string; total_quantity: number; challans: { challan_no: string; challan_date: string; quantity: number }[] }>();

  for (const challan of challans || []) {
    const challanBooks = (challan as any).challan_books || [];
    for (const cb of challanBooks) {
      const book = cb.books;
      if (!book) continue;

      const existing = bookMap.get(book.id);
      if (existing) {
        existing.total_quantity += cb.quantity || 1;
        existing.challans.push({
          challan_no: challan.challan_no,
          challan_date: challan.challan_date,
          quantity: cb.quantity || 1,
        });
      } else {
        bookMap.set(book.id, {
          id: book.id,
          title: book.title,
          total_quantity: cb.quantity || 1,
          challans: [{
            challan_no: challan.challan_no,
            challan_date: challan.challan_date,
            quantity: cb.quantity || 1,
          }],
        });
      }
    }
  }

  return NextResponse.json({
    data: Array.from(bookMap.values()),
    total_books: bookMap.size,
    total_challans: (challans || []).length,
  });
}

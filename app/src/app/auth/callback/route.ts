import { NextResponse } from 'next/server';

// OAuth callback no longer used — redirects to home
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`);
}

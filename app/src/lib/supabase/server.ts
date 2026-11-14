import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// supabase-js reports a network failure as "TypeError: fetch failed", which means
// nothing to the person looking at the screen. Give it a name and a next step.
// The library formats errors as `${name}: ${message}`.
async function dbFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    const err = new Error('the server could not be reached. Check the internet connection; if it keeps happening, ask the admin whether the Supabase project is paused.');
    err.name = 'Database offline';
    throw err;
  }
}

export async function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: dbFetch } }
  );
}

import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as path from 'path';
// Node.js implementation of hashPassword (matching lib/auth.ts)
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 },
    key,
    256
  );
  const out = new Uint8Array(48);
  out.set(salt, 0);
  out.set(new Uint8Array(bits), 16);
  return Array.from(out).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const email = 'admin@uphar.com';
  const password = 'password123';
  const password_hash = await hashPassword(password);

  const { data, error } = await supabase
    .from('data_entry_users')
    .upsert({
      email,
      name: 'Super Admin',
      password_hash,
      role: 'admin',
      status: 'approved',
      is_active: true
    }, { onConflict: 'email' })
    .select('id, email, role')
    .single();

  if (error) {
    console.error('Error creating admin user:', error);
  } else {
    console.log('Successfully created/updated admin user:', data);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  }
}

main().catch(console.error);

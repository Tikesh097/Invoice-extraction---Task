import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

// Admin client (service role) - for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client - for authenticated user operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'invoices';

export default supabaseAdmin;

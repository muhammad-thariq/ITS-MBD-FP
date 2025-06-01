// my-next-app/src/utils/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These environment variables are loaded by Next.js from your .env.local file
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Basic check for environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env.local file.');
  // In a production app, you might want to throw an error here to prevent runtime issues
  // throw new Error('Supabase credentials are not set.');
}

// Create and export the Supabase client instance with explicit typing
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
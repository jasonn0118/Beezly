import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | undefined;

if (
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
} else {
  console.warn(
    'Supabase environment variables not set. Supabase client will not be initialized.',
  );
}

export { supabase };

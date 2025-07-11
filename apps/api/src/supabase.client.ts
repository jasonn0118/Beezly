// 안전한 import 사용
import * as dotenv from 'dotenv';
import * as path from 'path';

if (!process.env.CI) {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:5000';

const supabaseKey: string =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

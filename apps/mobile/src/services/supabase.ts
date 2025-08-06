import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-get-random-values";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@env";

// const supabaseUrl = process.env.SUPABASE_URL || "";
// const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabaseUrl = SUPABASE_URL || "";
const supabaseAnonKey = SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ Supabase configuration missing. Check your environment variables."
  );
}

// Create Supabase client with AsyncStorage for React Native
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable for React Native
  },
});

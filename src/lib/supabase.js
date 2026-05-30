import { createClient } from '@supabase/supabase-js';

// ये वैल्यूज वर्सेल (Vercel) की सेटिंग्स से आएंगी
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

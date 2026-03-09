import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  (supabaseUrl.startsWith('https://') || supabaseUrl.includes('.supabase.co')) && 
  !supabaseUrl.includes('placeholder-project')
);

// Prevent crash if environment variables are missing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

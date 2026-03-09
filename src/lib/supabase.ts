import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  // @ts-ignore
  return (window.__ENV__?.[key] || import.meta.env[key] || '').trim();
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

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

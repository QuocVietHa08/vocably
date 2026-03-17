import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ⚠️  Replace these with your Supabase project values from:
//     https://supabase.com/dashboard → Project Settings → API
const _supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL;
const _supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON;

if (__DEV__) {
  if (!_supabaseUrl || _supabaseUrl === 'https://your-project.supabase.co') {
    console.warn('[Supabase] EXPO_PUBLIC_SUPABASE_URL is not configured');
  }
  if (!_supabaseAnon || _supabaseAnon === 'your-anon-key') {
    console.warn('[Supabase] EXPO_PUBLIC_SUPABASE_ANON is not configured');
  }
}

export const SUPABASE_URL  = _supabaseUrl  ?? 'https://your-project.supabase.co';
export const SUPABASE_ANON = _supabaseAnon ?? 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:          AsyncStorage,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
});

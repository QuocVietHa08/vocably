import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ⚠️  Replace these with your Supabase project values from:
//     https://supabase.com/dashboard → Project Settings → API
export const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? 'https://your-project.supabase.co';
export const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON ?? 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage:          AsyncStorage,
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
});

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl: string; supabaseKey: string; site: string };

export const SUPABASE_URL = extra.supabaseUrl;
export const SUPABASE_KEY = extra.supabaseKey;
export const SITE = extra.site || 'https://uykor.uz';
export const FN = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the session only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => {
    if (s === 'active') sb.auth.startAutoRefresh();
    else sb.auth.stopAutoRefresh();
  });
}

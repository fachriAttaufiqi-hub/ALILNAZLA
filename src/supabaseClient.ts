import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lactbjretztoutwerjsm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhY3RianJldHp0b3V0d2VyanNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDcyODIsImV4cCI6MjEwNjA4MzI4Mn0.17a2SBU4yKSxChyLIAOUwDJAYxqCM2ONTCryI8xex-o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

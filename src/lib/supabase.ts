import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable helper (works in Vite, Node, and browser)
const getEnvVar = (name: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[name]) {
      return (import.meta as any).env[name];
    }
  } catch {}

  try {
    if (typeof process !== 'undefined' && process?.env?.[name]) {
      return process.env[name] as string;
    }
  } catch {}

  return '';
};

// Retrieve configured credentials from localStorage or Environment Variables
export const getSupabaseConfig = (): { url: string; key: string } => {
  let url = '';
  let key = '';

  if (typeof window !== 'undefined' && window.localStorage) {
    url = localStorage.getItem('supabase_url') || '';
    key = localStorage.getItem('supabase_anon_key') || localStorage.getItem('supabase_key') || '';
  }

  if (!url) {
    url = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL') || 'https://lactbjretztoutwerjsm.supabase.co';
  }
  if (!key) {
    key = getEnvVar('VITE_SUPABASE_ANON_KEY') || 
          getEnvVar('SUPABASE_ANON_KEY') || 
          getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || 
          getEnvVar('SUPABASE_KEY') || 
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhY3RianJldHp0b3V0d2VyanNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDcyODIsImV4cCI6MjEwNjA4MzI4Mn0.17a2SBU4yKSxChyLIAOUwDJAYxqCM2ONTCryI8xex-o';
  }

  url = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  key = key.trim();

  return { url, key };
};

const initialConfig = getSupabaseConfig();
export let cleanSupabaseUrl = initialConfig.url;
export let cleanSupabaseKey = initialConfig.key;
export let isSupabaseApiKeyConfigured = Boolean(cleanSupabaseUrl && cleanSupabaseKey);

export let supabase: SupabaseClient | null = isSupabaseApiKeyConfigured
  ? createClient(cleanSupabaseUrl, cleanSupabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

// Listeners for runtime configuration changes
type ConfigChangeListener = (client: SupabaseClient | null) => void;
const configChangeListeners: Set<ConfigChangeListener> = new Set();

export const onSupabaseConfigChange = (listener: ConfigChangeListener): (() => void) => {
  configChangeListeners.add(listener);
  return () => configChangeListeners.delete(listener);
};

const notifyConfigChange = () => {
  configChangeListeners.forEach(listener => {
    try {
      listener(supabase);
    } catch (e) {
      console.error('Error in config change listener:', e);
    }
  });
};

// Reconfigure Supabase client at runtime (e.g. from UI settings modal or pairing link)
export const saveSupabaseConfig = (url: string, key: string): { success: boolean; client: SupabaseClient | null } => {
  cleanSupabaseUrl = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  cleanSupabaseKey = key.trim();
  isSupabaseApiKeyConfigured = Boolean(cleanSupabaseUrl && cleanSupabaseKey);

  if (typeof window !== 'undefined' && window.localStorage) {
    if (cleanSupabaseUrl) localStorage.setItem('supabase_url', cleanSupabaseUrl);
    else localStorage.removeItem('supabase_url');

    if (cleanSupabaseKey) localStorage.setItem('supabase_anon_key', cleanSupabaseKey);
    else localStorage.removeItem('supabase_anon_key');
  }

  if (isSupabaseApiKeyConfigured) {
    supabase = createClient(cleanSupabaseUrl, cleanSupabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  } else {
    supabase = null;
  }

  notifyConfigChange();

  return { success: isSupabaseApiKeyConfigured, client: supabase };
};

export const clearSupabaseConfig = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    localStorage.removeItem('supabase_key');
  }
  cleanSupabaseUrl = '';
  cleanSupabaseKey = '';
  isSupabaseApiKeyConfigured = false;
  supabase = null;
  notifyConfigChange();
};

// Check for 1-Click Spouse Pairing Link in URL query params (?sync_url=...&sync_key=...)
export const checkAndApplyUrlPairing = (): { paired: boolean; url?: string; message?: string } => {
  if (typeof window === 'undefined') return { paired: false };

  try {
    const params = new URLSearchParams(window.location.search);
    const syncUrl = params.get('sync_url') || params.get('supabase_url');
    const syncKey = params.get('sync_key') || params.get('supabase_key');

    if (syncUrl && syncKey) {
      const decodedUrl = decodeURIComponent(syncUrl).trim();
      const decodedKey = decodeURIComponent(syncKey).trim();

      saveSupabaseConfig(decodedUrl, decodedKey);
      localStorage.setItem('keluargafin_just_paired', 'true');

      // Clean query params from address bar without reloading
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);

      return {
        paired: true,
        url: decodedUrl,
        message: 'Berhasil ditautkan ke database pasangan! Semua data tersinkronisasi otomatis.',
      };
    }
  } catch (err: any) {
    console.warn('Gagal membaca parameter tautan pasangan:', err?.message);
  }

  return { paired: false };
};

// Fetch shared family credentials from server if available and not yet set locally
export const fetchServerSyncConfig = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  // If user already configured their own URL locally, preserve it
  if (localStorage.getItem('supabase_url')) return false;

  try {
    const res = await fetch('/api/sync/config');
    if (res.ok) {
      const data = await res.json();
      if (data.configured && data.url && data.key) {
        if (data.url !== cleanSupabaseUrl || data.key !== cleanSupabaseKey) {
          saveSupabaseConfig(data.url, data.key);
          return true;
        }
      }
    }
  } catch {}
  return false;
};

// Helper: Generate shareable link for spouse
export const createSpousePairingLink = (urlOverride?: string, keyOverride?: string): string => {
  if (typeof window === 'undefined') return '';
  const u = (urlOverride || cleanSupabaseUrl).trim();
  const k = (keyOverride || cleanSupabaseKey).trim();
  if (!u || !k) return window.location.origin;

  const origin = window.location.origin + window.location.pathname;
  return `${origin}?sync_url=${encodeURIComponent(u)}&sync_key=${encodeURIComponent(k)}`;
};

// Helper: Generate WhatsApp share invitation for spouse
export const createWhatsAppShareLink = (urlOverride?: string, keyOverride?: string): string => {
  const link = createSpousePairingLink(urlOverride, keyOverride);
  const text = `Hai sayang, ini link untuk menghubungkan aplikasi keuangan KeluargaFin kita agar catatan keuangan kita berdua 100% otomatis sinkron dan sama di kedua HP:\n\n${link}\n\nCukup klik link di atas sekali saja untuk langsung terhubung!`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
};

// Extract Project Ref (e.g. lactbjretztoutwerjsm)
export const getSupabaseProjectRef = (urlToUse?: string): string => {
  const target = urlToUse || cleanSupabaseUrl;
  try {
    const match = target.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
};

// Check if tables are already created and accessible in Supabase
export const checkSupabaseTablesExist = async (clientOverride?: SupabaseClient | null): Promise<{
  configured: boolean;
  tablesExist: boolean;
  projectRef: string;
  error?: string;
  rlsWarning?: boolean;
}> => {
  const client = clientOverride || supabase;
  if (!client) {
    return { configured: false, tablesExist: false, projectRef: '' };
  }

  const projectRef = getSupabaseProjectRef();

  try {
    const { error } = await client.from('transactions').select('id').limit(1);
    if (error) {
      if (
        error.code === 'PGRST205' || 
        error.code === '42P01' ||
        error.message?.includes('relation') || 
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache')
      ) {
        return {
          configured: true,
          tablesExist: false,
          projectRef,
          error: 'Tabel "transactions" belum dibuat di database Supabase.',
        };
      }

      if (error.code === '42501' || error.message?.toLowerCase().includes('row-level security') || error.message?.toLowerCase().includes('policy')) {
        return {
          configured: true,
          tablesExist: true,
          projectRef,
          rlsWarning: true,
          error: 'Tabel terdeteksi, namun terhalang Row-Level Security (RLS). Jalankan perintah ALTER TABLE ... DISABLE ROW LEVEL SECURITY;',
        };
      }

      return {
        configured: true,
        tablesExist: false,
        projectRef,
        error: error.message,
      };
    }

    return {
      configured: true,
      tablesExist: true,
      projectRef,
    };
  } catch (err: any) {
    return {
      configured: true,
      tablesExist: false,
      projectRef,
      error: err.message,
    };
  }
};

// Helper to push record to Supabase
export const syncToSupabase = async (table: string, record: any): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase client belum aktif' };
  try {
    const { error } = await supabase.from(table).insert([record]);
    if (error) {
      console.warn(`Supabase insert to ${table} error:`, error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn(`Supabase sync catch error on ${table}:`, err?.message);
    return { success: false, error: err?.message };
  }
};

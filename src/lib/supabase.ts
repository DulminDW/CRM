import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables safely
// Canonical client-safe variables: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey: string | undefined =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Diagnostic flag to detect whether client keys are present in the frontend runtime.
 * Never logs or exposes secret strings.
 */
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseUrl.trim() !== '' &&
  !supabaseUrl.includes('placeholder-project') &&
    supabasePublishableKey &&
  supabasePublishableKey.trim() !== '' &&
  !supabasePublishableKey.includes('placeholder-publishable-key') &&
  !supabasePublishableKey.includes('placeholder-anon-key')
);

let clientInstance: SupabaseClient | null = null;

    if(isSupabaseConfigured && supabaseUrl && supabasePublishableKey) {
    clientInstance = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'window_companies_crm_auth',
      },
    });
  } else {
    // Helpful development warning without revealing secrets
    console.warn(
      '[SupabaseClient] Supabase credentials are missing or set to placeholder defaults in environment variables. ' +
      'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are configured in .env.local.'
    );

    // Initialize a safe fallback client to avoid runtime crash on unconfigured local dev
    clientInstance = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabasePublishableKey || 'placeholder-publishable-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  export const supabase: SupabaseClient = clientInstance;


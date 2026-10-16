import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/**
 * The shared database, or null when no settings are present and the app keeps
 * everything on this device (handy for development and tests).
 */
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'kart-night:auth' } })
    : null

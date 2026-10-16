// Who is signed in, and which family's data they see.

import { useSyncExternalStore } from 'react'
import { RemoteSync } from './remote'
import { applySnapshot, connect, disconnect, reportSyncError } from './store'
import { supabase } from './supabase'

export interface Household {
  id: string
  name: string
  inviteCode: string
}

export type Session =
  | { status: 'device' }
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'setup'; email: string }
  | { status: 'ready'; email: string; household: Household }
  | { status: 'failed'; message: string }

let session: Session = supabase ? { status: 'loading' } : { status: 'device' }
let started = false
const listeners = new Set<() => void>()

function setSession(next: Session): void {
  session = next
  for (const l of listeners) l()
}

export function useSession(): Session {
  return useSyncExternalStore(
    l => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => session,
  )
}

async function loadHousehold(email: string): Promise<void> {
  if (!supabase) return
  const { data, error } = await supabase
    .from('households')
    .select('id,name,invite_code')
    .order('created_at')
    .limit(1)
  if (error) {
    setSession({ status: 'failed', message: `Couldn't reach the family database: ${error.message}` })
    return
  }
  const row = data?.[0] as { id: string; name: string; invite_code: string } | undefined
  if (!row) {
    setSession({ status: 'setup', email })
    return
  }
  const household = { id: row.id, name: row.name, inviteCode: row.invite_code }
  connect(new RemoteSync(supabase, household.id, applySnapshot, reportSyncError))
  setSession({ status: 'ready', email, household })
}

/** Restores a saved sign-in on this device, if there is one. Safe to call more than once. */
export async function startSession(): Promise<void> {
  if (!supabase || started) return
  started = true
  supabase.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') {
      disconnect()
      setSession({ status: 'signed-out' })
    }
  })
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) {
    setSession({ status: 'signed-out' })
    return
  }
  await loadHousehold(data.session.user.email ?? '')
}

/** Returns a message to show, or null on success. */
export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabase) return 'This copy of the app has no database settings.'
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) {
    return error.message === 'Invalid login credentials'
      ? 'That email and password don\'t match the family login. Check both and try again.'
      : `Couldn't sign in: ${error.message}`
  }
  await loadHousehold(data.user.email ?? email)
  return null
}

export async function signOut(): Promise<void> {
  disconnect()
  setSession({ status: 'signed-out' })
  await supabase?.auth.signOut()
}

/** First sign-in only: names the family and its racers. Returns a message, or null on success. */
export async function createHousehold(name: string, playerNames: string[]): Promise<string | null> {
  if (!supabase || session.status !== 'setup') return 'Sign in first.'
  const { error } = await supabase.rpc('create_household', { household_name: name, player_names: playerNames })
  if (error) return `Couldn't save your family: ${error.message}`
  await loadHousehold(session.email)
  return null
}

/** Joins another login's family with its invite code. Returns a message, or null on success. */
export async function joinHousehold(code: string): Promise<string | null> {
  if (!supabase || session.status !== 'setup') return 'Sign in first.'
  const { error } = await supabase.rpc('join_household', { code })
  if (error) return error.message.includes('invite code') ? 'No family uses that invite code. Check it and try again.' : `Couldn't join: ${error.message}`
  await loadHousehold(session.email)
  return null
}

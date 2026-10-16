// One store shared by every screen: racers, their current rides, and race events.
//
// On this device only (no database settings), everything is kept in browser
// storage. Signed in to the family database, every change shows on screen at
// once and is saved in the background, one save at a time and in order; the
// database copy then flows back in, including changes made on other devices.

import { useSyncExternalStore } from 'react'
import { loadJSON, saveJSON } from './local'
import { DEFAULT_PLAYERS, PLAYERS_KEY, RIDES_KEY, type Player, type Ride } from './players'
import type { RaceEntry, RaceEvent } from './racing'
import type { RemoteSync, Snapshot } from './remote'

export const EVENTS_KEY = 'kart-night:events'
export const ACTIVE_EVENT_KEY = 'kart-night:active-event'

export type SyncStatus = 'device' | 'loading' | 'saved' | 'saving' | 'error'

export interface State {
  players: Player[]
  rides: Record<string, Ride>
  events: RaceEvent[]
  /** The event on the Race screen: in progress, or finished and showing its results. */
  activeEventId: string | null
  sync: { status: SyncStatus; message?: string }
}

function deviceState(): State {
  return {
    players: loadJSON(PLAYERS_KEY, DEFAULT_PLAYERS),
    rides: loadJSON(RIDES_KEY, {}),
    events: loadJSON(EVENTS_KEY, []),
    activeEventId: loadJSON(ACTIVE_EVENT_KEY, null),
    sync: { status: 'device' },
  }
}

let state: State = deviceState()
let remote: RemoteSync | null = null
let pending = 0
let queue: Promise<void> = Promise.resolve()
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function set(change: (s: State) => State): void {
  const prev = state
  state = change(state)
  if (!remote) {
    if (state.players !== prev.players) saveJSON(PLAYERS_KEY, state.players)
    if (state.rides !== prev.rides) saveJSON(RIDES_KEY, state.rides)
    if (state.events !== prev.events) saveJSON(EVENTS_KEY, state.events)
  }
  if (state.activeEventId !== prev.activeEventId) saveJSON(ACTIVE_EVENT_KEY, state.activeEventId)
  for (const l of listeners) l()
}

function setSync(status: SyncStatus, message?: string): void {
  set(s => ({ ...s, sync: { status, message } }))
}

/** Queues a database save. The screen already shows the change. */
function save(what: string, op: (r: RemoteSync) => Promise<void>): void {
  const r = remote
  if (!r) return
  pending++
  setSync('saving')
  queue = queue
    .then(() => op(r))
    .then(
      () => {
        pending--
        if (remote !== r) return
        if (pending === 0) setSync('saved')
        r.refresh()
      },
      (err: Error) => {
        pending--
        if (remote !== r) return
        setSync('error', `${what} didn't save: ${err.message}`)
        r.refresh()
      },
    )
}

export function getState(): State {
  return state
}

/** Reads one part of the store and re-renders when it changes. */
export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}

// ---------- Switching between device-only and the family database ----------

export function connect(sync: RemoteSync): void {
  remote = sync
  pending = 0
  state = { players: [], rides: {}, events: [], activeEventId: loadJSON(ACTIVE_EVENT_KEY, null), sync: { status: 'loading' } }
  for (const l of listeners) l()
  sync.start()
}

export function disconnect(): void {
  remote?.stop()
  remote = null
  state = deviceState()
  for (const l of listeners) l()
}

/** The database's copy arrived. Ignored while saves are still on their way. */
export function applySnapshot(snapshot: Snapshot): void {
  if (!remote || pending > 0) return
  set(s => {
    const activeStillThere = snapshot.events.some(e => e.id === s.activeEventId)
    return {
      ...s,
      ...snapshot,
      activeEventId: activeStillThere ? s.activeEventId : null,
      sync: s.sync.status === 'error' && s.sync.message?.includes("didn't save") ? s.sync : { status: 'saved' },
    }
  })
}

export function reportSyncError(message: string): void {
  setSync('error', message)
}

export function retrySync(): void {
  if (!remote) return
  setSync(pending ? 'saving' : 'loading')
  remote.refresh()
}

// ---------- Changes ----------

export function renamePlayer(playerId: string, name: string): void {
  set(s => ({ ...s, players: s.players.map(p => (p.id === playerId ? { ...p, name } : p)) }))
  save('The new name', r => r.renamePlayer(playerId, name))
}

export function setRide(playerId: string, ride: Ride): void {
  set(s => ({ ...s, rides: { ...s.rides, [playerId]: ride } }))
  save('The ride', r => r.saveRide(playerId, ride))
}

export function patchRide(playerId: string, patch: Ride): void {
  setRide(playerId, { ...state.rides[playerId], ...patch })
}

export function startEvent(event: RaceEvent): void {
  set(s => ({ ...s, events: [...s.events, event], activeEventId: event.id }))
  save('The new cup', r => r.startEvent(event))
}

export function addRace(eventId: string, entry: RaceEntry): void {
  const event = state.events.find(e => e.id === eventId)
  if (!event) return
  const raceNo = event.races.length + 1
  set(s => ({ ...s, events: s.events.map(e => (e.id === eventId ? { ...e, races: [...e.races, entry] } : e)) }))
  save(`Race ${raceNo}`, r => r.addRace(eventId, raceNo, entry))
}

export function undoLastRace(eventId: string): void {
  const event = state.events.find(e => e.id === eventId)
  if (!event || !event.races.length) return
  const raceNo = event.races.length
  set(s => ({ ...s, events: s.events.map(e => (e.id === eventId ? { ...e, races: e.races.slice(0, -1) } : e)) }))
  save(`Undoing race ${raceNo}`, r => r.undoRace(eventId, raceNo))
}

export function removeEvent(eventId: string): void {
  set(s => ({
    ...s,
    events: s.events.filter(e => e.id !== eventId),
    activeEventId: s.activeEventId === eventId ? null : s.activeEventId,
  }))
  save('Deleting', r => r.removeEvent(eventId))
}

export function setActiveEvent(eventId: string | null): void {
  set(s => ({ ...s, activeEventId: eventId }))
}

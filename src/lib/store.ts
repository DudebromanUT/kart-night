// One small store shared by every screen: racers, their current rides, and race
// events. It lives in this browser for now; step 4 syncs it through the database.

import { useSyncExternalStore } from 'react'
import { loadJSON, saveJSON } from './local'
import { DEFAULT_PLAYERS, PLAYERS_KEY, RIDES_KEY, type Player, type Ride } from './players'
import type { RaceEvent } from './racing'

export const EVENTS_KEY = 'kart-night:events'
export const ACTIVE_EVENT_KEY = 'kart-night:active-event'

export interface State {
  players: Player[]
  rides: Record<string, Ride>
  events: RaceEvent[]
  /** The event on the Race screen: in progress, or finished and showing its results. */
  activeEventId: string | null
}

let state: State = {
  players: loadJSON(PLAYERS_KEY, DEFAULT_PLAYERS),
  rides: loadJSON(RIDES_KEY, {}),
  events: loadJSON(EVENTS_KEY, []),
  activeEventId: loadJSON(ACTIVE_EVENT_KEY, null),
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getState(): State {
  return state
}

export function update(change: (s: State) => State): void {
  const prev = state
  state = change(state)
  if (state.players !== prev.players) saveJSON(PLAYERS_KEY, state.players)
  if (state.rides !== prev.rides) saveJSON(RIDES_KEY, state.rides)
  if (state.events !== prev.events) saveJSON(EVENTS_KEY, state.events)
  if (state.activeEventId !== prev.activeEventId) saveJSON(ACTIVE_EVENT_KEY, state.activeEventId)
  for (const l of listeners) l()
}

/** Reads one part of the store and re-renders when it changes. */
export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state))
}

export function patchRide(playerId: string, patch: Ride): void {
  update(s => ({ ...s, rides: { ...s.rides, [playerId]: { ...s.rides[playerId], ...patch } } }))
}

export function setRide(playerId: string, ride: Ride): void {
  update(s => ({ ...s, rides: { ...s.rides, [playerId]: ride } }))
}

export function renamePlayer(playerId: string, name: string): void {
  update(s => ({ ...s, players: s.players.map(p => (p.id === playerId ? { ...p, name } : p)) }))
}

export function saveEvent(event: RaceEvent): void {
  update(s => {
    const exists = s.events.some(e => e.id === event.id)
    return { ...s, events: exists ? s.events.map(e => (e.id === event.id ? event : e)) : [...s.events, event] }
  })
}

export function removeEvent(eventId: string): void {
  update(s => ({
    ...s,
    events: s.events.filter(e => e.id !== eventId),
    activeEventId: s.activeEventId === eventId ? null : s.activeEventId,
  }))
}

export function setActiveEvent(eventId: string | null): void {
  update(s => ({ ...s, activeEventId: eventId }))
}

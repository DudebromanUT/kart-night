// Wheel sounds, synthesized with Web Audio so there are no files to load.
// Browsers only allow sound after a tap, so call unlock() from a click handler.

import { loadJSON, saveJSON } from '../lib/local'

const MUTE_KEY = 'kart-night:muted'

let ctx: AudioContext | null = null
let muted = loadJSON<boolean>(MUTE_KEY, false)
let lastTick = 0

export function isMuted(): boolean {
  return muted
}

export function setMuted(value: boolean): void {
  muted = value
  saveJSON(MUTE_KEY, value)
}

export function unlock(): void {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

function ready(): AudioContext | null {
  return !muted && ctx && ctx.state === 'running' ? ctx : null
}

function tone(ac: AudioContext, freq: number, start: number, length: number, type: OscillatorType, peak: number): void {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
  osc.connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + length + 0.02)
}

/** The flapper clicking a peg. Capped so a fast spin buzzes instead of stacking up. */
export function tick(): void {
  const ac = ready()
  if (!ac) return
  const now = ac.currentTime
  if (now - lastTick < 0.035) return
  lastTick = now
  tone(ac, 1700 + Math.random() * 400, now, 0.035, 'square', 0.05)
}

/** A wheel coming to rest. */
export function land(): void {
  const ac = ready()
  if (!ac) return
  const now = ac.currentTime
  tone(ac, 1046.5, now, 0.35, 'triangle', 0.18)
  tone(ac, 1568, now + 0.09, 0.5, 'triangle', 0.16)
}

/** A full ride picked: driver, outfit and vehicle. */
export function fanfare(): void {
  const ac = ready()
  if (!ac) return
  const now = ac.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((f, i) => {
    tone(ac, f, now + i * 0.09, 0.22, 'square', 0.06)
    tone(ac, f, now + i * 0.09, 0.25, 'triangle', 0.12)
  })
  tone(ac, 1318.5, now + 0.38, 0.7, 'triangle', 0.14)
  tone(ac, 1046.5, now + 0.38, 0.7, 'square', 0.04)
}

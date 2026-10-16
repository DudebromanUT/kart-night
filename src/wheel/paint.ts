// Paints the wheel artwork onto 2D canvases. PixiJS turns these into GPU textures,
// then spins, blurs and lights them. Painting once and rotating a texture keeps the
// spin smooth on tablets.

import { mix, textOn } from '../lib/color'
import { TAU } from './math'

export interface Slice {
  label: string
  /** Slice fill. Shaded from light at the hub to dark at the rim. */
  color: string
  /** Optional token near the rim, like a driver's badge. */
  badge?: { text: string; color: string }
}

export type RimFinish = 'gold' | 'silver'

export const DISPLAY_FONT = 'Fredoka, "Arial Rounded MT Bold", "Trebuchet MS", sans-serif'

/** Rim outer radius as a multiple of the face radius. */
export const RIM_RATIO = 1.12
/** Where the bulbs sit, as a multiple of the face radius. */
export const BULB_RATIO = 1.06

function canvas2d(width: number, height: number, dpr: number) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(width * dpr))
  canvas.height = Math.max(1, Math.ceil(height * dpr))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  ctx.scale(dpr, dpr)
  return { canvas, ctx }
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, size: number, maxWidth: number, min = 6): number {
  ctx.font = `600 ${size}px ${DISPLAY_FONT}`
  const width = ctx.measureText(text).width
  if (width <= maxWidth) return size
  const fitted = Math.max(min, Math.floor(size * (maxWidth / width) * 10) / 10)
  ctx.font = `600 ${fitted}px ${DISPLAY_FONT}`
  return fitted
}

/** The spinning face: shaded slices, labels, badges and pegs. */
export function paintFace(slices: Slice[], r: number, dpr: number, hubRatio: number): HTMLCanvasElement {
  const n = slices.length
  const a = TAU / n
  const { canvas, ctx } = canvas2d(r * 2, r * 2, dpr)
  ctx.translate(r, r)

  const hasBadges = slices.some(s => s.badge)
  const badgeAt = r * 0.885
  const badgeR = Math.min(a * badgeAt * 0.4, r * 0.06)
  const labelOuter = hasBadges ? badgeAt - badgeR - r * 0.03 : r * 0.9
  const labelInner = r * (hubRatio + 0.07)
  const labelMid = (labelOuter + labelInner) / 2
  // Wheels with few slices (outfits) have room for bigger type.
  const baseFont = Math.min(r * (n <= 12 ? 0.12 : 0.075), a * labelMid * 0.7)

  slices.forEach((s, i) => {
    const start = -Math.PI / 2 + i * a
    const fill = i % 2 ? mix(s.color, '#000000', 0.12) : s.color
    const grad = ctx.createRadialGradient(0, 0, r * hubRatio, 0, 0, r)
    grad.addColorStop(0, mix(fill, '#ffffff', 0.32))
    grad.addColorStop(0.5, fill)
    grad.addColorStop(1, mix(fill, '#000000', 0.32))
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, r, start, start + a)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
  })

  // Slice edges
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = Math.max(1, r * 0.004)
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + i * a
    ctx.beginPath()
    ctx.moveTo(Math.cos(ang) * r * hubRatio, Math.sin(ang) * r * hubRatio)
    ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r)
    ctx.stroke()
  }

  // Labels and badges, laid along each slice's center line
  slices.forEach((s, i) => {
    const mid = -Math.PI / 2 + (i + 0.5) * a
    const fill = i % 2 ? mix(s.color, '#000000', 0.12) : s.color
    ctx.save()
    ctx.rotate(mid)

    const ink = textOn(fill)
    fitFont(ctx, s.label, baseFont, labelOuter - labelInner)
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = ink === '#ffffff' ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)'
    ctx.shadowBlur = Math.max(1, r * 0.008)
    ctx.shadowOffsetY = Math.max(0.5, r * 0.003)
    ctx.fillStyle = ink
    ctx.fillText(s.label, labelOuter, 0)
    ctx.shadowColor = 'transparent'

    if (s.badge) {
      const g = ctx.createRadialGradient(badgeAt - badgeR * 0.35, -badgeR * 0.35, badgeR * 0.1, badgeAt, 0, badgeR)
      g.addColorStop(0, mix(s.badge.color, '#ffffff', 0.45))
      g.addColorStop(0.6, s.badge.color)
      g.addColorStop(1, mix(s.badge.color, '#000000', 0.3))
      ctx.beginPath()
      ctx.arc(badgeAt, 0, badgeR, 0, TAU)
      ctx.fillStyle = g
      ctx.fill()
      ctx.lineWidth = Math.max(1, badgeR * 0.14)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.stroke()

      ctx.translate(badgeAt, 0)
      ctx.rotate(Math.PI / 2) // upright when the slice is at the top
      const size = badgeR * (s.badge.text.length > 1 ? 0.82 : 1.05)
      ctx.font = `600 ${size}px ${DISPLAY_FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = textOn(s.badge.color)
      ctx.fillText(s.badge.text, 0, size * 0.06)
    }
    ctx.restore()
  })

  // Pegs at every slice edge, for the pointer to click against
  const pegR = Math.max(1.4, Math.min(r * 0.014, a * r * 0.1))
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + i * a
    const x = Math.cos(ang) * r * 0.958
    const y = Math.sin(ang) * r * 0.958
    const g = ctx.createRadialGradient(x - pegR * 0.4, y - pegR * 0.4, pegR * 0.1, x, y, pegR)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.5, '#d8d6e8')
    g.addColorStop(1, '#5b5873')
    ctx.beginPath()
    ctx.arc(x, y, pegR, 0, TAU)
    ctx.fillStyle = g
    ctx.fill()
  }

  // Dark lip around the edge
  ctx.beginPath()
  ctx.arc(0, 0, r - Math.max(1, r * 0.006), 0, TAU)
  ctx.lineWidth = Math.max(1.5, r * 0.012)
  ctx.strokeStyle = 'rgba(10,8,30,0.55)'
  ctx.stroke()

  return canvas
}

/** The fixed metal ring around the face, with sockets for the bulbs. */
export function paintRim(r: number, dpr: number, finish: RimFinish, bulbs: number): HTMLCanvasElement {
  const outer = r * RIM_RATIO
  const { canvas, ctx } = canvas2d(outer * 2, outer * 2, dpr)
  ctx.translate(outer, outer)

  const stops = finish === 'gold'
    ? ['#fff4c2', '#ffc83d', '#b77514', '#ffe28a', '#8a560c', '#ffd25e']
    : ['#ffffff', '#c9cbe0', '#6f7290', '#eef0ff', '#5b5e7a', '#d5d8ee']
  const g = ctx.createLinearGradient(-outer, -outer, outer, outer)
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c))

  ctx.beginPath()
  ctx.arc(0, 0, outer, 0, TAU)
  ctx.arc(0, 0, r * 0.995, 0, TAU, true)
  ctx.fillStyle = g
  ctx.fill('evenodd')

  // Bevels: bright outer edge, shadowed inner edge
  ctx.lineWidth = Math.max(1, r * 0.01)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.arc(0, 0, outer - ctx.lineWidth, 0, TAU)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(20,14,40,0.6)'
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.0, 0, TAU)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, outer - 0.5, 0, TAU)
  ctx.lineWidth = Math.max(1, r * 0.006)
  ctx.stroke()

  for (let i = 0; i < bulbs; i++) {
    const ang = -Math.PI / 2 + (i + 0.5) * (TAU / bulbs)
    ctx.beginPath()
    ctx.arc(Math.cos(ang) * r * BULB_RATIO, Math.sin(ang) * r * BULB_RATIO, r * 0.026, 0, TAU)
    ctx.fillStyle = 'rgba(40,24,10,0.65)'
    ctx.fill()
  }
  return canvas
}

/** Gold center cap with a star. */
export function paintHub(radius: number, dpr: number): HTMLCanvasElement {
  const { canvas, ctx } = canvas2d(radius * 2, radius * 2, dpr)
  ctx.translate(radius, radius)
  const g = ctx.createRadialGradient(-radius * 0.35, -radius * 0.4, radius * 0.05, 0, 0, radius)
  g.addColorStop(0, '#fff8d6')
  g.addColorStop(0.45, '#ffc83d')
  g.addColorStop(1, '#a8650d')
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.97, 0, TAU)
  ctx.fillStyle = g
  ctx.fill()
  ctx.lineWidth = radius * 0.08
  ctx.strokeStyle = '#7a4708'
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.78, 0, TAU)
  ctx.lineWidth = radius * 0.04
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.stroke()

  // Five-point star
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? radius * 0.24 : radius * 0.56
    const ang = -Math.PI / 2 + (i * Math.PI) / 5
    ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
  }
  ctx.closePath()
  ctx.fillStyle = '#fffdf2'
  ctx.shadowColor = 'rgba(120,60,0,0.6)'
  ctx.shadowBlur = radius * 0.08
  ctx.shadowOffsetY = radius * 0.04
  ctx.fill()
  return canvas
}

/** Red flapper. Its pivot is the center of the round cap, `pivotY` from the top. */
export function paintPointer(width: number, height: number, dpr: number): { canvas: HTMLCanvasElement; pivotY: number } {
  const { canvas, ctx } = canvas2d(width, height, dpr)
  const cap = width / 2
  const pad = width * 0.06
  const cx = width / 2
  const cy = cap
  ctx.beginPath()
  ctx.arc(cx, cy, cap - pad, Math.PI * 0.85, Math.PI * 0.15)
  ctx.lineTo(cx, height - pad)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, 0, width, 0)
  g.addColorStop(0, '#ff8a80')
  g.addColorStop(0.45, '#ff3b3b')
  g.addColorStop(1, '#9e0f16')
  ctx.fillStyle = g
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = width * 0.12
  ctx.shadowOffsetY = width * 0.06
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = Math.max(1, width * 0.05)
  ctx.strokeStyle = '#5c0a0e'
  ctx.stroke()

  // Highlight streak and bolt
  ctx.beginPath()
  ctx.moveTo(cx - cap * 0.35, cy + cap * 0.2)
  ctx.lineTo(cx - cap * 0.05, height - pad * 4)
  ctx.lineWidth = Math.max(1, width * 0.07)
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.stroke()
  const bolt = ctx.createRadialGradient(cx - cap * 0.1, cy - cap * 0.1, 1, cx, cy, cap * 0.35)
  bolt.addColorStop(0, '#ffffff')
  bolt.addColorStop(1, '#8c8aa6')
  ctx.beginPath()
  ctx.arc(cx, cy, cap * 0.3, 0, TAU)
  ctx.fillStyle = bolt
  ctx.fill()
  return { canvas, pivotY: cy }
}

/** Fixed glass sheen and edge shading laid over the face. */
export function paintGloss(r: number, dpr: number): HTMLCanvasElement {
  const { canvas, ctx } = canvas2d(r * 2, r * 2, dpr)
  ctx.translate(r, r)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, TAU)
  ctx.clip()
  const sheen = ctx.createRadialGradient(-r * 0.35, -r * 0.5, r * 0.05, -r * 0.2, -r * 0.3, r * 1.05)
  sheen.addColorStop(0, 'rgba(255,255,255,0.26)')
  sheen.addColorStop(0.45, 'rgba(255,255,255,0.06)')
  sheen.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = sheen
  ctx.fillRect(-r, -r, r * 2, r * 2)
  const edge = ctx.createRadialGradient(0, 0, r * 0.78, 0, 0, r)
  edge.addColorStop(0, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.32)')
  ctx.fillStyle = edge
  ctx.fillRect(-r, -r, r * 2, r * 2)
  return canvas
}

/** Soft round light, used for bulbs, halos and the floor shadow (tinted). */
export function paintGlow(size: number): HTMLCanvasElement {
  const { canvas, ctx } = canvas2d(size, size, 1)
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.75)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.18)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return canvas
}

/** Light rays that fan out behind the wheel. */
export function paintRays(size: number, rays: number): HTMLCanvasElement {
  const { canvas, ctx } = canvas2d(size, size, 1)
  const c = size / 2
  ctx.translate(c, c)
  const w = TAU / rays / 2
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < rays; i++) {
    const ang = i * (TAU / rays)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, c, ang - w / 2, ang + w / 2)
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'destination-in'
  const fade = ctx.createRadialGradient(0, 0, c * 0.3, 0, 0, c)
  fade.addColorStop(0, 'rgba(255,255,255,0.9)')
  fade.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = fade
  ctx.fillRect(-c, -c, size, size)
  return canvas
}

/** Confetti pieces: a star and a coin. */
export function paintStar(size: number): HTMLCanvasElement {
  const { canvas, ctx } = canvas2d(size, size, 1)
  const c = size / 2
  ctx.translate(c, c)
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? c * 0.42 : c * 0.95
    const ang = -Math.PI / 2 + (i * Math.PI) / 5
    ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr)
  }
  ctx.closePath()
  const g = ctx.createRadialGradient(-c * 0.2, -c * 0.3, 1, 0, 0, c)
  g.addColorStop(0, '#fffbe0')
  g.addColorStop(0.5, '#ffd54a')
  g.addColorStop(1, '#e08a00')
  ctx.fillStyle = g
  ctx.fill()
  return canvas
}

export function paintCoin(size: number): HTMLCanvasElement {
  const { canvas, ctx } = canvas2d(size, size, 1)
  const c = size / 2
  const g = ctx.createRadialGradient(c * 0.7, c * 0.6, 1, c, c, c)
  g.addColorStop(0, '#fff6c8')
  g.addColorStop(0.5, '#ffc83d')
  g.addColorStop(1, '#a86a0a')
  ctx.beginPath()
  ctx.ellipse(c, c, c * 0.62, c * 0.95, 0, 0, TAU)
  ctx.fillStyle = g
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(c, c, c * 0.22, c * 0.55, 0, 0, TAU)
  ctx.lineWidth = Math.max(1, c * 0.12)
  ctx.strokeStyle = 'rgba(140,80,0,0.7)'
  ctx.stroke()
  return canvas
}

// One wheel: the spinning face, its rim of marquee bulbs, the glass sheen,
// the gold hub and the flapper that clicks against the pegs.

import { BlurFilter, Container, Graphics, Sprite, Texture, type DestroyOptions } from 'pixi.js'
import { BULB_RATIO, RIM_RATIO, paintFace, paintGloss, paintHub, paintPointer, paintRim, type RimFinish, type Slice } from './paint'
import { cryptoRandom, landingRotation, pegsPassed, sliceAngle, spinEase } from './math'

export interface WheelLook {
  finish: RimFinish
  bulbs: number
  /** Hub radius as a fraction of the face radius. */
  hubRatio: number
}

export interface SpinOptions {
  /** Milliseconds from launch to stop. */
  duration: number
  /** Full turns before it starts looking for the winner. */
  minTurns: number
}

interface Spin {
  from: number
  to: number
  start: number
  duration: number
  index: number
  resolve: () => void
}

const GHOSTS = 3
/** Where the flapper's tip sits, as a fraction of the face radius above center. */
export const TIP_RATIO = 0.975

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export class WheelView extends Container {
  readonly look: WheelLook
  onPeg?: () => void
  onHubTap?: () => void
  /** Current angular speed, radians per second. */
  speed = 0

  private rotor = new Container()
  private face = new Sprite()
  private ghosts: Sprite[] = []
  private dim = new Graphics()
  private flash = new Graphics()
  private rim = new Sprite()
  private gloss = new Sprite()
  private hub = new Sprite()
  private pointer = new Sprite()
  private halos: Sprite[] = []
  private cores: Sprite[] = []
  private blur = new BlurFilter({ strength: 0, quality: 3 })
  private blurOn = false
  private owned: Texture[] = []

  private slices: Slice[] = []
  private r = 0
  private turn = 0
  private spin: Spin | null = null
  private clock = 0
  private flapAngle = 0
  private flapVel = 0
  private winIndex: number | null = null
  private winAt = 0
  private dimTarget = 0

  constructor(look: WheelLook, glow: Texture) {
    super()
    this.look = look
    for (const s of [this.face, this.rim, this.gloss, this.hub]) s.anchor.set(0.5)
    for (let i = 0; i < GHOSTS; i++) {
      const g = new Sprite()
      g.anchor.set(0.5)
      g.visible = false
      this.ghosts.push(g)
    }
    this.flash.blendMode = 'add'
    this.dim.alpha = 0
    this.flash.alpha = 0
    this.rotor.addChild(this.face, ...this.ghosts, this.dim, this.flash)
    this.addChild(this.rotor, this.rim)

    for (let i = 0; i < look.bulbs; i++) {
      const halo = new Sprite(glow)
      halo.anchor.set(0.5)
      halo.blendMode = 'add'
      halo.tint = 0xffc24a
      const core = new Sprite(glow)
      core.anchor.set(0.5)
      core.tint = 0xfff4cf
      this.halos.push(halo)
      this.cores.push(core)
    }
    this.addChild(...this.halos, ...this.cores, this.gloss, this.hub, this.pointer)

    this.hub.eventMode = 'static'
    this.hub.cursor = 'pointer'
    this.hub.on('pointertap', () => this.onHubTap?.())
  }

  get radius(): number {
    return this.r
  }

  get isSpinning(): boolean {
    return this.spin !== null
  }

  /** Where the flapper's tip is, in the parent's coordinates. */
  tip(): { x: number; y: number } {
    return { x: this.x, y: this.y - this.r * TIP_RATIO * this.scale.y }
  }

  setHubVisible(visible: boolean): void {
    this.hub.visible = visible
  }

  /** Repaints every texture for these slices at this radius. */
  configure(slices: Slice[], r: number, dpr: number): void {
    this.slices = slices
    this.r = r
    for (const t of this.owned) t.destroy(true)
    this.owned = []
    const texture = (canvas: HTMLCanvasElement) => {
      const t = Texture.from(canvas, true)
      this.owned.push(t)
      return t
    }

    const faceTexture = texture(paintFace(slices, r, dpr, this.look.hubRatio))
    this.face.texture = faceTexture
    this.face.setSize(r * 2)
    for (const g of this.ghosts) {
      g.texture = faceTexture
      g.setSize(r * 2)
    }

    this.rim.texture = texture(paintRim(r, dpr, this.look.finish, this.look.bulbs))
    this.rim.setSize(r * RIM_RATIO * 2)
    this.gloss.texture = texture(paintGloss(r, dpr))
    this.gloss.setSize(r * 2)

    const hubR = r * this.look.hubRatio
    this.hub.texture = texture(paintHub(hubR, dpr))
    this.hub.setSize(hubR * 2)

    const pw = r * 0.14
    const ph = r * 0.26
    const { canvas, pivotY } = paintPointer(pw, ph, dpr)
    this.pointer.texture = texture(canvas)
    this.pointer.setSize(pw, ph)
    this.pointer.anchor.set(0.5, pivotY / ph)
    this.pointer.position.set(0, -r * TIP_RATIO - (ph - pivotY))

    const n = this.halos.length
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i + 0.5) * ((Math.PI * 2) / n)
      const x = Math.cos(ang) * r * BULB_RATIO
      const y = Math.sin(ang) * r * BULB_RATIO
      this.halos[i].position.set(x, y)
      this.halos[i].setSize(r * 0.17)
      this.cores[i].position.set(x, y)
      this.cores[i].setSize(r * 0.055)
    }
    this.drawHighlight()
  }

  /** Spins until slice `index` stops under the pointer. */
  spinTo(index: number, opts: SpinOptions): Promise<void> {
    if (!this.slices.length) return Promise.resolve()
    this.spin?.resolve()
    this.clearWin()
    const reduced = prefersReducedMotion()
    const duration = reduced ? Math.min(opts.duration, 900) : opts.duration
    const minTurns = reduced ? 1 : opts.minTurns
    const offset = 0.18 + cryptoRandom() * 0.64
    const to = landingRotation(this.turn, index, this.slices.length, minTurns, offset)
    return new Promise(resolve => {
      this.spin = { from: this.turn, to, start: performance.now(), duration, index, resolve }
    })
  }

  clearWin(): void {
    this.winIndex = null
    this.dimTarget = 0
  }

  /**
   * Advances one frame. Spin timing follows the real clock (`now`), so a slow
   * device drops frames but still stops on time; physics uses the capped `deltaMs`.
   */
  update(deltaMs: number, now: number): void {
    const dt = Math.min(deltaMs, 50)
    this.clock = now
    const prev = this.turn

    const spin = this.spin
    if (spin) {
      const t = (this.clock - spin.start) / spin.duration
      this.turn = spin.from + (spin.to - spin.from) * spinEase(t)
      if (t >= 1) {
        this.turn = spin.to
        this.spin = null
        this.win(spin.index)
        spin.resolve()
      }
    }
    this.speed = deltaMs > 0 ? (this.turn - prev) / (Math.max(deltaMs, 1) / 1000) : 0
    this.rotor.rotation = this.turn

    // Flapper: kicked by each peg, pulled back by a spring.
    if (this.slices.length && pegsPassed(prev, this.turn, this.slices.length) > 0) {
      this.flapVel = Math.min(this.flapVel, 0) - 7
      this.onPeg?.()
    }
    const secs = dt / 1000
    this.flapVel += (-700 * this.flapAngle - 15 * this.flapVel) * secs
    this.flapAngle += this.flapVel * secs
    if (this.flapAngle < -0.5) {
      this.flapAngle = -0.5
      this.flapVel = Math.max(0, this.flapVel)
    }
    this.pointer.rotation = this.flapAngle

    this.updateMotionBlur()
    this.updateBulbs()
    this.updateHighlight(dt)
  }

  private updateMotionBlur(): void {
    const s = Math.abs(this.speed)
    const reduced = prefersReducedMotion()
    const strength = reduced ? 0 : Math.min(10, Math.max(0, (s - 4) * 0.7))
    if (strength > 0.3) {
      this.blur.strength = strength
      if (!this.blurOn) {
        this.face.filters = [this.blur]
        this.blurOn = true
      }
    } else if (this.blurOn) {
      this.face.filters = []
      this.blurOn = false
    }
    // Trailing copies of the face smear the spin like a long exposure,
    // fading out as the wheel slows so the labels sharpen up before it stops.
    const smear = Math.min(0.08, s * 0.004)
    const presence = reduced ? 0 : Math.min(1, Math.max(0, (s - 3) / 6))
    this.ghosts.forEach((g, i) => {
      g.visible = presence > 0
      g.rotation = -smear * (i + 1)
      g.alpha = (presence * 0.32) / (i + 1)
    })
  }

  private updateBulbs(): void {
    const n = this.halos.length
    const sinceWin = this.winIndex !== null ? this.clock - this.winAt : Infinity
    const stepMs = Math.max(35, 150 - Math.abs(this.speed) * 7)
    const step = Math.floor(this.clock / stepMs)
    for (let i = 0; i < n; i++) {
      let level: number
      if (this.spin) {
        level = (((i - step) % 4) + 4) % 4 === 0 ? 1 : 0.15
      } else if (sinceWin < 2400) {
        level = i % 2 === Math.floor(sinceWin / 130) % 2 ? 1 : 0.12
      } else {
        level = 0.45 + 0.3 * Math.sin(this.clock / 650 + i * 0.8)
      }
      this.halos[i].alpha = level * 0.85
      this.cores[i].alpha = 0.35 + level * 0.65
    }
  }

  private win(index: number): void {
    this.winIndex = index
    this.winAt = this.clock
    this.dimTarget = 1
    this.drawHighlight()
  }

  private drawHighlight(): void {
    this.dim.clear()
    this.flash.clear()
    if (this.winIndex === null || !this.slices.length) return
    const a = sliceAngle(this.slices.length)
    for (let i = 0; i < this.slices.length; i++) {
      const start = -Math.PI / 2 + i * a
      const g = i === this.winIndex ? this.flash : this.dim
      g.moveTo(0, 0).arc(0, 0, this.r, start, start + a).closePath()
      g.fill(i === this.winIndex ? { color: 0xffffff, alpha: 1 } : { color: 0x0a0820, alpha: 0.6 })
    }
  }

  private updateHighlight(dt: number): void {
    this.dim.alpha += (this.dimTarget - this.dim.alpha) * Math.min(1, dt / 140)
    if (this.winIndex === null) {
      this.flash.alpha = Math.max(0, this.flash.alpha - dt / 200)
      return
    }
    const since = this.clock - this.winAt
    const burst = since < 400 ? 0.55 * (1 - since / 400) : 0
    this.flash.alpha = 0.14 + 0.1 * Math.sin(since / 120) + burst
  }

  override destroy(options?: DestroyOptions): void {
    this.spin?.resolve()
    this.spin = null
    for (const t of this.owned) t.destroy(true)
    this.owned = []
    super.destroy(options)
  }
}

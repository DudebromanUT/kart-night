// The stage behind one wheel: the WebGL canvas, light rays, floor shadow,
// an optional inner wheel (outfits) and the confetti burst when a wheel stops.

import { Application, Container, Sprite, Texture } from 'pixi.js'
import { DISPLAY_FONT, paintCoin, paintGlow, paintRays, paintStar, type Slice } from './paint'
import { WheelView, prefersReducedMotion, type SpinOptions, type WheelLook } from './WheelView'

export interface StageOptions {
  slices: Slice[]
  look: WheelLook
  /** Look for a smaller wheel that pops up over the hub. */
  inner?: WheelLook
  onPeg?: () => void
  onHubTap?: () => void
  /** Space (px) kept clear at the top and bottom for labels laid over the canvas. */
  frame?: { top: number; bottom: number }
}

/** Inner wheel radius as a fraction of the main wheel's. */
const INNER_RATIO = 0.5
/** Total height of a wheel with its pointer, as a multiple of the face radius. */
const HEIGHT_RATIO = 2.42
const WIDTH_RATIO = 2.3

interface Tween {
  from: number
  to: number
  start: number
  duration: number
  ease: (t: number) => number
  apply: (v: number) => void
  done?: () => void
}

interface Particle {
  sprite: Sprite
  vx: number
  vy: number
  vr: number
  age: number
  life: number
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
const easeInQuad = (t: number) => t * t

function pixelRatio(): number {
  return Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2)
}

async function fontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return
  const timeout = new Promise(resolve => setTimeout(resolve, 2500))
  await Promise.race([document.fonts.load(`600 24px ${DISPLAY_FONT}`), timeout]).catch(() => undefined)
}

const CONFETTI_TINTS = [0xff3b3b, 0x3e8ce5, 0x2fb36b, 0xffc83d, 0x8b5cf6, 0xff6fb5]

export class WheelStage {
  readonly main: WheelView
  readonly inner: WheelView | null

  private app: Application
  private host: HTMLElement
  private slices: Slice[]
  private innerSlices: Slice[] = []
  private root = new Container()
  private fx = new Container()
  private rays: Sprite
  private ambient: Sprite
  private shadow: Sprite
  private shared: { glow: Texture; rays: Texture; star: Texture; coin: Texture }
  private tweens: Tween[] = []
  private particles: Particle[] = []
  private clock = 0
  private glowBoost = 0
  private observer: ResizeObserver
  private resizeTimer: ReturnType<typeof setTimeout> | undefined
  private dpr = pixelRatio()
  private frame: { top: number; bottom: number }

  static async create(host: HTMLElement, opts: StageOptions): Promise<WheelStage> {
    await fontsReady()
    const app = new Application()
    await app.init({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
      backgroundAlpha: 0,
      antialias: true,
      resolution: pixelRatio(),
      autoDensity: true,
      preference: 'webgl',
    })
    return new WheelStage(app, host, opts)
  }

  private constructor(app: Application, host: HTMLElement, opts: StageOptions) {
    this.app = app
    this.host = host
    this.slices = opts.slices
    this.frame = opts.frame ?? { top: 0, bottom: 0 }
    host.appendChild(app.canvas)
    app.canvas.style.display = 'block'

    this.shared = {
      glow: Texture.from(paintGlow(128), true),
      rays: Texture.from(paintRays(512, 18), true),
      star: Texture.from(paintStar(48), true),
      coin: Texture.from(paintCoin(48), true),
    }

    this.ambient = new Sprite(this.shared.glow)
    this.ambient.anchor.set(0.5)
    this.ambient.tint = 0x6b4dff
    this.ambient.alpha = 0.4
    this.ambient.blendMode = 'add'

    this.rays = new Sprite(this.shared.rays)
    this.rays.anchor.set(0.5)
    this.rays.tint = 0xffe2a0
    this.rays.alpha = 0.08
    this.rays.blendMode = 'add'

    this.shadow = new Sprite(this.shared.glow)
    this.shadow.anchor.set(0.5)
    this.shadow.tint = 0x000000
    this.shadow.alpha = 0.7

    this.main = new WheelView(opts.look, this.shared.glow)
    this.main.onPeg = opts.onPeg
    this.main.onHubTap = opts.onHubTap

    this.inner = opts.inner ? new WheelView(opts.inner, this.shared.glow) : null
    if (this.inner) {
      this.inner.visible = false
      this.inner.scale.set(0)
      this.inner.onPeg = opts.onPeg
    }

    this.root.addChild(this.ambient, this.rays, this.shadow, this.main)
    if (this.inner) this.root.addChild(this.inner)
    this.root.addChild(this.fx)
    app.stage.addChild(this.root)

    app.ticker.add(ticker => this.update(ticker.deltaMS))
    this.observer = new ResizeObserver(() => {
      clearTimeout(this.resizeTimer)
      this.resizeTimer = setTimeout(() => this.layout(false), 120)
    })
    this.observer.observe(host)
    this.layout(true)
  }

  setSlices(slices: Slice[]): void {
    this.slices = slices
    this.main.configure(slices, this.main.radius, this.dpr)
  }

  spin(index: number, opts: SpinOptions): Promise<void> {
    return this.main.spinTo(index, opts).then(() => this.celebrate(this.main, 70))
  }

  async showInner(slices: Slice[]): Promise<void> {
    const inner = this.inner
    if (!inner) return
    this.innerSlices = slices
    inner.configure(slices, this.main.radius * INNER_RATIO, this.dpr)
    inner.clearWin()
    inner.visible = true
    this.main.setHubVisible(false)
    await this.tween(inner.scale.x, 1, 520, easeOutBack, v => inner.scale.set(Math.max(0, v)))
  }

  hideInner(): void {
    const inner = this.inner
    if (!inner || !inner.visible) return
    this.tween(inner.scale.x, 0, 220, easeInQuad, v => inner.scale.set(Math.max(0, v)), () => {
      inner.visible = false
      this.main.setHubVisible(true)
    })
  }

  spinInner(index: number, opts: SpinOptions): Promise<void> {
    const inner = this.inner
    if (!inner || !inner.visible) return Promise.resolve()
    return inner.spinTo(index, opts).then(() => this.celebrate(inner, 40))
  }

  destroy(): void {
    clearTimeout(this.resizeTimer)
    this.observer.disconnect()
    for (const t of this.tweens) t.done?.()
    this.tweens = []
    this.app.destroy({ removeView: true }, { children: true })
    for (const t of Object.values(this.shared)) t.destroy(true)
  }

  private layout(force: boolean): void {
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    if (w < 2 || h < 2) return
    this.app.renderer.resize(w, h)
    const room = Math.max(10, h - this.frame.top - this.frame.bottom)
    const r = Math.min(w / WIDTH_RATIO, room / HEIGHT_RATIO)
    const cx = w / 2
    const cy = this.frame.top + (room - r * HEIGHT_RATIO) / 2 + r * 1.24

    this.main.position.set(cx, cy)
    this.inner?.position.set(cx, cy)
    this.shadow.position.set(cx, cy + r * 0.08)
    this.shadow.setSize(r * 2.7)
    this.rays.position.set(cx, cy)
    this.rays.setSize(r * 4.4)
    this.ambient.position.set(cx, cy)
    this.ambient.setSize(r * 3.4)

    if (force || Math.abs(r - this.main.radius) > 1) {
      this.main.configure(this.slices, r, this.dpr)
      if (this.inner?.visible && this.innerSlices.length) {
        this.inner.configure(this.innerSlices, r * INNER_RATIO, this.dpr)
      }
    }
  }

  private tween(from: number, to: number, duration: number, ease: Tween['ease'], apply: Tween['apply'], done?: () => void): Promise<void> {
    return new Promise(resolve => {
      this.tweens.push({
        from, to, start: performance.now(), duration, ease, apply,
        done: () => {
          done?.()
          resolve()
        },
      })
    })
  }

  private celebrate(view: WheelView, count: number): void {
    this.glowBoost = 1
    if (prefersReducedMotion()) return
    const { x, y } = view.tip()
    const scale = this.main.radius / 220
    for (let i = 0; i < count; i++) {
      const kind = i % 3
      const sprite = new Sprite(kind === 0 ? this.shared.star : kind === 1 ? this.shared.coin : Texture.WHITE)
      sprite.anchor.set(0.5)
      if (kind === 2) {
        sprite.tint = CONFETTI_TINTS[i % CONFETTI_TINTS.length]
        sprite.setSize(9 * scale, 5 * scale)
      } else {
        sprite.setSize((kind === 0 ? 18 : 14) * scale * (0.7 + Math.random() * 0.6))
      }
      sprite.position.set(x, y)
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.6
      const speed = (260 + Math.random() * 520) * scale
      this.particles.push({
        sprite,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        vr: (Math.random() - 0.5) * 14,
        age: 0,
        life: 1100 + Math.random() * 900,
      })
      this.fx.addChild(sprite)
    }
  }

  private update(deltaMs: number): void {
    const dt = Math.min(deltaMs, 50)
    const now = performance.now()
    this.clock = now
    this.main.update(deltaMs, now)
    this.inner?.update(deltaMs, now)

    this.tweens = this.tweens.filter(t => {
      const p = Math.min(1, (this.clock - t.start) / t.duration)
      t.apply(t.from + (t.to - t.from) * t.ease(p))
      if (p >= 1) {
        t.done?.()
        return false
      }
      return true
    })

    const spinning = this.main.isSpinning || !!this.inner?.isSpinning
    const speed = Math.max(Math.abs(this.main.speed), Math.abs(this.inner?.speed ?? 0))
    this.rays.rotation += dt * (0.00004 + speed * 0.00003)
    this.glowBoost = Math.max(0, this.glowBoost - dt / 1800)
    const raysTarget = 0.08 + (spinning ? 0.12 : 0) + this.glowBoost * 0.4
    this.rays.alpha += (raysTarget - this.rays.alpha) * Math.min(1, dt / 220)
    this.ambient.alpha = 0.35 + this.glowBoost * 0.35 + (spinning ? 0.1 : 0)

    const gravity = 1300 * (this.main.radius / 220)
    const secs = dt / 1000
    this.particles = this.particles.filter(p => {
      p.age += dt
      p.vy += gravity * secs
      p.vx *= 0.99
      p.sprite.x += p.vx * secs
      p.sprite.y += p.vy * secs
      p.sprite.rotation += p.vr * secs
      p.sprite.alpha = 1 - Math.pow(p.age / p.life, 2)
      if (p.age >= p.life) {
        p.sprite.destroy()
        return false
      }
      return true
    })

    // Idle wheels redraw at 30 fps to save tablet batteries.
    const busy = spinning || this.particles.length > 0 || this.tweens.length > 0 || this.glowBoost > 0
    this.app.ticker.maxFPS = busy ? 0 : 30
  }
}

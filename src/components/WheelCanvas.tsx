import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { WheelStage } from '../wheel/WheelStage'
import type { Slice } from '../wheel/paint'
import type { SpinOptions, WheelLook } from '../wheel/WheelView'

export interface WheelHandle {
  spin(index: number, opts: SpinOptions): Promise<void>
  showInner(slices: Slice[]): Promise<void>
  spinInner(index: number, opts: SpinOptions): Promise<void>
  hideInner(): void
}

interface Props {
  slices: Slice[]
  look: WheelLook
  inner?: WheelLook
  label: string
  onPeg?: () => void
  onHubTap?: () => void
  /** Space (px) kept clear at the top and bottom for labels laid over the canvas. */
  frame?: { top: number; bottom: number }
  ref?: Ref<WheelHandle>
}

/** Hosts one WebGL wheel. If the device can't draw it, spins still resolve, just without animation. */
export function WheelCanvas({ slices, look, inner, label, onPeg, onHubTap, frame, ref }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<WheelStage | null>(null)
  const handlers = useRef({ onPeg, onHubTap })
  const firstSlices = useRef(slices)
  const setup = useRef({ look, inner, frame })
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    handlers.current = { onPeg, onHubTap }
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    WheelStage.create(host, {
      slices: firstSlices.current,
      look: setup.current.look,
      inner: setup.current.inner,
      frame: setup.current.frame,
      onPeg: () => handlers.current.onPeg?.(),
      onHubTap: () => handlers.current.onHubTap?.(),
    })
      .then(stage => {
        if (disposed) stage.destroy()
        else stageRef.current = stage
      })
      .catch(err => {
        console.error('Wheel could not start', err)
        if (!disposed) setFailed(true)
      })
    return () => {
      disposed = true
      stageRef.current?.destroy()
      stageRef.current = null
    }
  }, [])

  useEffect(() => {
    if (slices !== firstSlices.current) stageRef.current?.setSlices(slices)
  }, [slices])

  useImperativeHandle(ref, () => ({
    spin: (index, opts) => stageRef.current?.spin(index, opts) ?? Promise.resolve(),
    showInner: s => stageRef.current?.showInner(s) ?? Promise.resolve(),
    spinInner: (index, opts) => stageRef.current?.spinInner(index, opts) ?? Promise.resolve(),
    hideInner: () => stageRef.current?.hideInner(),
  }), [])

  return (
    <div className="wheel-host" ref={hostRef} role="img" aria-label={label}>
      {failed && <p className="wheel-fallback">This browser can't draw the wheel. Spins still pick at random.</p>}
    </div>
  )
}

import { useMemo, type CSSProperties } from 'react'

const COLORS = ['#ff3b3b', '#3e8ce5', '#2fb36b', '#ffc83d', '#8b5cf6', '#ff6fb5']

interface Props {
  /** Bump this number to fire a new burst. 0 shows nothing. */
  burst: number
}

/** A full-screen confetti shower for cup wins. Skipped when the viewer prefers less motion. */
export function Confetti({ burst }: Props) {
  const pieces = useMemo(() => {
    if (!burst) return []
    let seed = burst * 9301 + 49297
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    return Array.from({ length: 90 }, (_, i) => ({
      x: rand() * 100,
      delay: rand() * 0.5,
      duration: 2.4 + rand() * 1.8,
      drift: (rand() - 0.5) * 160,
      spin: 360 + rand() * 720,
      color: COLORS[i % COLORS.length],
      round: i % 3 === 0,
    }))
  }, [burst])

  if (!burst) return null
  return (
    <div className="confetti" aria-hidden="true" key={burst}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className={p.round ? 'is-round' : undefined}
          style={{
            '--x': `${p.x}%`,
            '--delay': `${p.delay}s`,
            '--duration': `${p.duration}s`,
            '--drift': `${p.drift}px`,
            '--spin': `${p.spin}deg`,
            background: p.color,
          } as CSSProperties}
        />
      ))}
    </div>
  )
}

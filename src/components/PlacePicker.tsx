import { FIELD_SIZE, ordinal, pointsFor } from '../lib/scoring'

interface Props {
  labelId: string
  value: number | null
  /** Places other racers already hold, with who holds them. */
  taken: Map<number, string>
  onPick: (place: number | null) => void
}

const PLACES = Array.from({ length: FIELD_SIZE }, (_, i) => i + 1)

/** A 24-button grid of finishing places, each showing the points it's worth. */
export function PlacePicker({ labelId, value, taken, onPick }: Props) {
  return (
    <div className="place-grid" role="group" aria-labelledby={labelId}>
      {PLACES.map(place => {
        const owner = taken.get(place)
        const selected = value === place
        const podium = place <= 3 ? ` podium-${place}` : ''
        return (
          <button
            key={place}
            type="button"
            className={`place${selected ? ' is-selected' : ''}${podium}`}
            onClick={() => onPick(selected ? null : place)}
            disabled={!!owner && !selected}
            aria-pressed={selected}
          >
            <span className="place-n">{ordinal(place)}</span>
            <span className="place-pts">{owner && !selected ? owner : `+${pointsFor(place)}`}</span>
          </button>
        )
      })}
    </div>
  )
}

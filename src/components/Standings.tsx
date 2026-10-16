import { DRIVER_BY_ID } from '../data/drivers'
import type { Player, Ride } from '../lib/players'
import { sharedRanks, type StandingRow } from '../lib/racing'
import { Badge } from './Badge'

interface Props {
  title: string
  rows: StandingRow[]
  players: Player[]
  rides: Record<string, Ride>
  emptyNote: string
}

/** Leaderboard: points first, with wins and average place underneath. Ties share a rank. */
export function Standings({ title, rows, players, rides, emptyNote }: Props) {
  const nameOf = (id: string) => players.find(p => p.id === id)?.name ?? 'Former racer'
  const anyRaces = rows.some(r => r.races > 0)
  const ranks = sharedRanks(rows.map(r => r.points))
  return (
    <section className="panel standings" aria-labelledby="standings-title">
      <h2 id="standings-title">{title}</h2>
      {!anyRaces && <p className="empty-note">{emptyNote}</p>}
      <ol className="standings-list">
        {rows.map((row, i) => {
          const rank = ranks[i]
          const driverId = rides[row.playerId]?.driverId
          return (
            <li key={row.playerId} className={`standing${anyRaces && rank === 1 ? ' is-leader' : ''}`}>
              <span className="standing-rank">{rank}</span>
              <Badge driver={driverId ? DRIVER_BY_ID[driverId] : undefined} size="sm" />
              <span className="standing-who">
                <span className="standing-name">{nameOf(row.playerId)}</span>
                <span className="standing-meta">
                  {row.races
                    ? `${row.wins} win${row.wins === 1 ? '' : 's'} · avg ${row.averagePlace?.toFixed(1)} · ${row.races} race${row.races === 1 ? '' : 's'}`
                    : 'No races yet'}
                </span>
              </span>
              <span className="standing-points">{row.points}<small>pts</small></span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

import { Badge } from '../components/Badge'
import { Standings } from '../components/Standings'
import { DRIVER_BY_ID } from '../data/drivers'
import { VEHICLE_BY_ID } from '../data/vehicles'
import { headToHead, playerRecords, raceNights, type PlayerRecord } from '../lib/history'
import { eventName, eventWinners, isFinished, standings } from '../lib/racing'
import { ordinal } from '../lib/scoring'
import { useStore } from '../lib/store'

function joinNames(names: string[]): string {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

const nightDate = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

export function HistoryScreen() {
  const players = useStore(s => s.players)
  const rides = useStore(s => s.rides)
  const events = useStore(s => s.events)
  const ids = players.map(p => p.id)
  const names = Object.fromEntries(players.map(p => [p.id, p.name]))
  const anyRaces = events.some(e => e.races.length > 0)

  if (!anyRaces) {
    return (
      <main className="history-page">
        <section className="panel">
          <h1>History</h1>
          <p className="empty-note">No races saved yet. Finish a race on the Race tab and the records start here.</p>
        </section>
      </main>
    )
  }

  const records = playerRecords(events, ids)
  const head = headToHead(events, ids)
  const nights = raceNights(events)

  return (
    <main className="history-page">
      <div className="history-main">
        <Standings title="All time" rows={standings(events, ids)} players={players} rides={rides} emptyNote="" />

        <section aria-labelledby="records-title" className="records">
          <h2 id="records-title" className="section-title">Racer records</h2>
          <div className="record-grid">
            {records.map(r => <RecordCard key={r.playerId} record={r} name={names[r.playerId]} />)}
          </div>
        </section>

        {ids.length > 1 && (
          <section className="panel" aria-labelledby="h2h-title">
            <h2 id="h2h-title">Head to head</h2>
            <p className="empty-note">Finished ahead and behind, counting races both of them ran. Read across a row.</p>
            <div className="table-wrap">
              <table className="h2h-table">
                <thead>
                  <tr>
                    <th scope="col"><span className="visually-hidden">Racer</span></th>
                    {players.map(p => <th key={p.id} scope="col">vs {p.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {players.map(a => (
                    <tr key={a.id}>
                      <th scope="row">{a.name}</th>
                      {players.map(b => {
                        if (a.id === b.id) return <td key={b.id} className="h2h-self">·</td>
                        const { ahead, behind } = head[a.id][b.id]
                        const tone = ahead + behind === 0 ? '' : ahead > behind ? ' is-up' : ahead < behind ? ' is-down' : ' is-even'
                        return (
                          <td key={b.id} className={`h2h-cell${tone}`}>
                            {ahead + behind ? <>{ahead}<span aria-hidden="true">–</span><span className="visually-hidden"> ahead, </span>{behind}<span className="visually-hidden"> behind</span></> : '·'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <aside className="history-side">
        <section className="panel" aria-labelledby="nights-title">
          <h2 id="nights-title">Race nights</h2>
          <ol className="nights">
            {nights.map(n => (
              <li key={n.start} className="night">
                <div className="night-head">
                  <span className="night-date">{nightDate(n.start)}</span>
                  <span className="night-count">{n.races} race{n.races === 1 ? '' : 's'}</span>
                </div>
                <p className="night-winner">
                  {joinNames(n.winners.map(id => names[id] ?? 'Former racer'))} won the night with {n.points[n.winners[0]]} pts
                </p>
                <ul className="night-events">
                  {n.events.map(e => (
                    <li key={e.id}>
                      {eventName(e)}
                      <span>
                        {isFinished(e)
                          ? ` · ${joinNames(eventWinners(e).map(id => names[id] ?? 'Former racer'))}`
                          : ` · ${e.races.length} of ${e.kind === 'gp' ? 4 : 1} races`}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </main>
  )
}

function RecordCard({ record: r, name }: { record: PlayerRecord; name?: string }) {
  const fav = r.favoriteDriver ? DRIVER_BY_ID[r.favoriteDriver.id] : undefined
  const best = r.bestDriver ? DRIVER_BY_ID[r.bestDriver.id] : undefined
  const vehicle = r.favoriteVehicle ? VEHICLE_BY_ID[r.favoriteVehicle.id] : undefined
  return (
    <article className="panel record">
      <header className="record-head">
        <Badge driver={fav} size="md" />
        <div>
          <h3>{name ?? 'Former racer'}</h3>
          <p className="record-sub">{r.races} race{r.races === 1 ? '' : 's'}{r.bestPlace ? ` · best finish ${ordinal(r.bestPlace)}` : ''}</p>
        </div>
      </header>
      <dl className="record-stats">
        <div><dt>Cups won</dt><dd>{r.cupsWon}</dd></div>
        <div><dt>Rallies won</dt><dd>{r.ralliesWon}</dd></div>
        <div><dt>Race wins</dt><dd>{r.wins}</dd></div>
        <div><dt>Podiums</dt><dd>{r.podiums}</dd></div>
        <div><dt>Avg place</dt><dd>{r.averagePlace?.toFixed(1) ?? '·'}</dd></div>
      </dl>
      <ul className="record-notes">
        {fav && r.favoriteDriver && (
          <li><span>Raced most as</span> <strong>{fav.name}{r.favoriteDriver.outfit ? ` (${r.favoriteDriver.outfit})` : ''}</strong> · {r.favoriteDriver.races} race{r.favoriteDriver.races === 1 ? '' : 's'}</li>
        )}
        {best && r.bestDriver && (
          <li><span>Best as</span> <strong>{best.name}</strong> · avg place {r.bestDriver.averagePlace.toFixed(1)}</li>
        )}
        {vehicle && r.favoriteVehicle && (
          <li><span>Favorite vehicle</span> <strong>{vehicle.name}</strong> · {r.favoriteVehicle.races} race{r.favoriteVehicle.races === 1 ? '' : 's'}</li>
        )}
      </ul>
    </article>
  )
}

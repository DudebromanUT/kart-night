import { useState, type FormEvent } from 'react'
import { createHousehold, joinHousehold, signOut } from '../lib/session'
import { getState } from '../lib/store'

const MAX_RACERS = 8

/** First sign-in: name the family and its racers, or join a family by invite code. */
export function SetupScreen({ email }: { email: string }) {
  const [family, setFamily] = useState('Our family')
  const [names, setNames] = useState<string[]>(() => getState().players.map(p => p.name))
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)

  const setName = (i: number, value: string) => setNames(list => list.map((n, j) => (j === i ? value : n)))

  async function create(e: FormEvent) {
    e.preventDefault()
    const cleaned = names.map(n => n.trim())
    if (!family.trim()) return setError('Give your family a name.')
    if (cleaned.some(n => !n)) return setError('Every racer needs a name, or remove the empty one.')
    if (new Set(cleaned.map(n => n.toLowerCase())).size !== cleaned.length) return setError('Two racers have the same name. Make each one different.')
    setBusy(true)
    setError(null)
    const problem = await createHousehold(family.trim(), cleaned)
    setBusy(false)
    if (problem) setError(problem)
  }

  async function join(e: FormEvent) {
    e.preventDefault()
    if (!code.trim()) return setJoinError('Enter the invite code.')
    setBusy(true)
    setJoinError(null)
    const problem = await joinHousehold(code)
    setBusy(false)
    if (problem) setJoinError(problem)
  }

  return (
    <main className="gate">
      <div className="gate-stack">
        <form className="panel gate-card" onSubmit={create} noValidate>
          <p className="brand">Kart Night</p>
          <h1>Set up your family</h1>
          <p className="gate-note">Signed in as {email}. Name the family and its racers once; every device signed in with this login shares them.</p>
          <div className="field">
            <label htmlFor="setup-family">Family name</label>
            <input id="setup-family" value={family} maxLength={60} onChange={e => setFamily(e.target.value)} />
          </div>
          <fieldset className="field racers-field">
            <legend>Racers</legend>
            {names.map((name, i) => (
              <div key={i} className="racer-input">
                <input
                  id={`setup-racer-${i}`}
                  aria-label={`Racer ${i + 1}`}
                  value={name}
                  maxLength={16}
                  onChange={e => setName(i, e.target.value)}
                />
                {names.length > 1 && (
                  <button type="button" className="btn btn-ghost" onClick={() => setNames(list => list.filter((_, j) => j !== i))}>
                    Remove<span className="visually-hidden"> {name || `racer ${i + 1}`}</span>
                  </button>
                )}
              </div>
            ))}
            {names.length < MAX_RACERS && (
              <button type="button" className="btn btn-ghost" onClick={() => setNames(list => [...list, ''])}>Add a racer</button>
            )}
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-go" disabled={busy}>{busy ? 'Saving…' : 'Save and start racing'}</button>
        </form>

        <form className="panel gate-card join-card" onSubmit={join} noValidate>
          <h2>Joining a family that already races here?</h2>
          <p className="gate-note">Enter the invite code from the account menu on one of their devices.</p>
          <div className="field">
            <label htmlFor="setup-code">Invite code</label>
            <input id="setup-code" value={code} autoCapitalize="characters" autoComplete="off" onChange={e => setCode(e.target.value)} />
          </div>
          {joinError && <p className="form-error" role="alert">{joinError}</p>}
          <button type="submit" className="btn btn-ghost" disabled={busy}>Join with code</button>
        </form>

        <button type="button" className="btn btn-ghost gate-signout" onClick={() => void signOut()}>Sign out</button>
      </div>
    </main>
  )
}

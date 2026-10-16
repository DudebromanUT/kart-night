import { useState, type FormEvent } from 'react'
import { signIn } from '../lib/session'

export function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter the family email and password.')
      return
    }
    setBusy(true)
    setError(null)
    const problem = await signIn(email, password)
    setBusy(false)
    if (problem) setError(problem)
  }

  return (
    <main className="gate">
      <form className="panel gate-card" onSubmit={submit} noValidate>
        <p className="brand">Kart Night</p>
        <h1>Sign in</h1>
        <p className="gate-note">Use the family login. This device stays signed in, so you only do this once per phone or tablet.</p>
        <div className="field">
          <label htmlFor="signin-email">Email</label>
          <input id="signin-email" type="email" inputMode="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="signin-password">Password</label>
          <input id="signin-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-go" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  )
}

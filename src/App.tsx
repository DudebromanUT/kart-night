import { useEffect, useState } from 'react'
import { AccountMenu } from './components/AccountMenu'
import { startSession, useSession } from './lib/session'
import { retrySync, useStore } from './lib/store'
import { HistoryScreen } from './screens/HistoryScreen'
import { RaceScreen } from './screens/RaceScreen'
import { RosterScreen } from './screens/RosterScreen'
import { SetupScreen } from './screens/SetupScreen'
import { SignInScreen } from './screens/SignInScreen'
import { SpinScreen } from './screens/SpinScreen'

type Tab = 'spin' | 'race' | 'history' | 'roster'

const TABS: { id: Tab; label: string }[] = [
  { id: 'spin', label: 'Spin' },
  { id: 'race', label: 'Race' },
  { id: 'history', label: 'History' },
  { id: 'roster', label: 'Roster' },
]

function tabFromHash(): Tab {
  const hash = window.location.hash.slice(1)
  return TABS.some(t => t.id === hash) ? (hash as Tab) : 'spin'
}

function Gate({ message, retry }: { message: string; retry?: boolean }) {
  return (
    <main className="gate">
      <div className="panel gate-card" role="status">
        <p className="brand">Kart Night</p>
        <p className="gate-note">{message}</p>
        {retry && <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>Try again</button>}
      </div>
    </main>
  )
}

export default function App() {
  const session = useSession()
  const sync = useStore(s => s.sync)
  const [tab, setTab] = useState<Tab>(tabFromHash)

  useEffect(() => {
    void startSession()
  }, [])

  useEffect(() => {
    window.history.replaceState(null, '', `#${tab}`)
  }, [tab])

  if (session.status === 'loading') return <Gate message="Starting up…" />
  if (session.status === 'failed') return <Gate message={session.message} retry />
  if (session.status === 'signed-out') return <SignInScreen />
  if (session.status === 'setup') return <SetupScreen email={session.email} />
  if (session.status === 'ready' && sync.status === 'loading') return <Gate message="Loading your family's races…" />

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">Kart Night</span>
          <nav className="tabs" aria-label="Sections">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                className={`tab${tab === t.id ? ' is-active' : ''}`}
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <AccountMenu session={session} />
        </div>
      </header>
      {sync.status === 'error' && (
        <div className="sync-banner" role="alert">
          <p>{sync.message}</p>
          <button type="button" className="btn btn-ghost" onClick={retrySync}>Try again</button>
        </div>
      )}
      {tab === 'spin' && <SpinScreen />}
      {tab === 'race' && <RaceScreen />}
      {tab === 'history' && <HistoryScreen />}
      {tab === 'roster' && <RosterScreen />}
    </div>
  )
}

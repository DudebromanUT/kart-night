import { useEffect, useState } from 'react'
import { RosterScreen } from './screens/RosterScreen'
import { SpinScreen } from './screens/SpinScreen'

type Tab = 'spin' | 'roster'

const TABS: { id: Tab; label: string }[] = [
  { id: 'spin', label: 'Spin' },
  { id: 'roster', label: 'Roster' },
]

function tabFromHash(): Tab {
  return window.location.hash === '#roster' ? 'roster' : 'spin'
}

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash)

  useEffect(() => {
    window.history.replaceState(null, '', `#${tab}`)
  }, [tab])

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
        </div>
      </header>
      {tab === 'spin' ? <SpinScreen /> : <RosterScreen />}
    </div>
  )
}

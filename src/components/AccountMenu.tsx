import { signOut, type Session } from '../lib/session'
import { useStore, type SyncStatus } from '../lib/store'

const LABEL: Record<SyncStatus, string> = {
  device: 'This device only',
  loading: 'Loading…',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved',
}

/** Save status in the top bar; opens to the family details and sign-out. */
export function AccountMenu({ session }: { session: Session }) {
  const status = useStore(s => s.sync.status)
  return (
    <details className="account">
      <summary className={`sync sync-${status}`}>
        <span className="sync-dot" aria-hidden="true" />
        {LABEL[status]}
      </summary>
      <div className="account-panel">
        {session.status === 'ready' ? (
          <>
            <p className="account-family">{session.household.name}</p>
            <p className="account-note">Signed in as {session.email}</p>
            <p className="account-note">
              Invite code <code>{session.household.inviteCode}</code>
              <br />
              Lets a personal login join this family later.
            </p>
            <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>Sign out of this device</button>
          </>
        ) : (
          <p className="account-note">Scores are saved in this browser only. Add database settings to share them between devices.</p>
        )}
      </div>
    </details>
  )
}

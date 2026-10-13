import { useState } from 'react'
import { DONATE } from '../config'
import { useLongPress } from '../hooks/useLongPress'

/**
 * Bottom right: donate button. A chevron (desktop) or a long press on the
 * dollar (touch) reveals the GitHub link to its left.
 */
export function RightDock() {
  const [open, setOpen] = useState(false)
  const [donateOpen, setDonateOpen] = useState(false)
  const longPress = useLongPress(() => setOpen((v) => !v))
  const paypal = DONATE.paypal.trim()
  const venmo = DONATE.venmo.trim()

  return (
    <>
      <div className={`dock right${open ? ' open' : ''}`}>
        <button className="chevron" onClick={() => setOpen((v) => !v)} title={open ? 'Hide' : 'More'} aria-label={open ? 'Hide links' : 'More links'} aria-expanded={open}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div className="extra" aria-hidden={!open}>
          <a className="round" tabIndex={open ? 0 : -1} href="https://github.com/spacecowboyian/BonRurgundy" target="_blank" rel="noopener noreferrer" title="Source on GitHub" aria-label="Source on GitHub">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </svg>
          </a>
        </div>
        {(paypal || venmo) && (
          <button
            className="round"
            {...longPress}
            onClick={() => setDonateOpen((v) => !v)}
            title="Support this project (hold for more)"
            aria-label="Donate"
            aria-expanded={donateOpen}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2v20" />
              <path d="M17 6.5c-1-1.5-2.5-2-5-2-3 0-5 1.5-5 3.5s2 3 5 3.5 5 1.5 5 3.5-2 3.5-5 3.5c-2.5 0-4-.5-5-2" />
            </svg>
          </button>
        )}
      </div>
      {donateOpen && (
        <>
          <div className="sheet-backdrop" onClick={() => setDonateOpen(false)} />
          <div className="donate-sheet" role="dialog">
            <strong>Support BonRurgundy</strong>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>Free to use. If it saved you a take, buy the dev a coffee.</span>
            {paypal && (
              <a className="donate-link" href={`https://paypal.me/${encodeURIComponent(paypal)}`} target="_blank" rel="noopener noreferrer">
                PayPal
              </a>
            )}
            {venmo && (
              <a className="donate-link" href={`https://venmo.com/u/${encodeURIComponent(venmo)}`} target="_blank" rel="noopener noreferrer">
                Venmo
              </a>
            )}
          </div>
        </>
      )}
    </>
  )
}

import { useState } from 'react'
import { DONATE } from '../config'

/** Heart button, lower right. Opens a small sheet with PayPal / Venmo links. */
export function DonateButton() {
  const [open, setOpen] = useState(false)
  const paypal = DONATE.paypal.trim()
  const venmo = DONATE.venmo.trim()
  if (!paypal && !venmo) return null
  return (
    <>
      <button className="donate" onClick={() => setOpen((v) => !v)} title="Support this project" aria-label="Donate" aria-expanded={open}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20" />
          <path d="M17 6.5c-1-1.5-2.5-2-5-2-3 0-5 1.5-5 3.5s2 3 5 3.5 5 1.5 5 3.5-2 3.5-5 3.5c-2.5 0-4-.5-5-2" />
        </svg>
      </button>
      {open && (
        <>
          <div className="sheet-backdrop" onClick={() => setOpen(false)} />
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

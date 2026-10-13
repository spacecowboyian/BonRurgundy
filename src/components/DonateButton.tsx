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
        <svg width="22" height="22" viewBox="0 0 24 24" fill={open ? '#ff3b30' : 'none'} stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      </button>
      {open && (
        <>
          <div className="sheet-backdrop" onClick={() => setOpen(false)} />
          <div className="donate-sheet" role="dialog">
            <strong>Support Osmo Prompter</strong>
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

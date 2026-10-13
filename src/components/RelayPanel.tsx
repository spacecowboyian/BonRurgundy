import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { normalizeCode, type RelayView } from '../hooks/useRelay'

interface Props {
  relay: RelayView
  canShare: boolean
  onShare: () => void
}

/** Settings section: share this camera to a phone, or receive one from a Mac. */
export function RelayPanel({ relay, canShare, onShare }: Props) {
  const [qr, setQr] = useState<string | null>(null)
  const [input, setInput] = useState('')

  const joinUrl = relay.mode === 'share' && relay.code ? `${location.origin}${location.pathname}?join=${relay.code}` : null
  useEffect(() => {
    if (!joinUrl) {
      setQr(null)
      return
    }
    QRCode.toDataURL(joinUrl, { margin: 1, width: 220, color: { dark: '#000000', light: '#ffffff' } }).then(setQr).catch(() => setQr(null))
  }, [joinUrl])

  const statusText =
    relay.status === 'off'
      ? ''
      : relay.status === 'connecting'
        ? 'connecting…'
        : relay.status === 'waiting'
          ? relay.mode === 'share'
            ? 'waiting for a phone'
            : 'waiting for the Mac to share'
          : relay.status === 'connected'
            ? relay.mode === 'share'
              ? `${relay.viewers} phone${relay.viewers === 1 ? '' : 's'} watching`
              : 'receiving'
            : `error: ${relay.error}`

  return (
    <>
      <h3>Phone monitor</h3>
      {relay.mode === 'idle' && (
        <>
          {canShare && (
            <button onClick={onShare}>Share this camera to a phone</button>
          )}
          <div className="row">
            <label>Code</label>
            <input
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              placeholder="from the Mac"
              value={input}
              maxLength={4}
              onChange={(e) => setInput(normalizeCode(e.target.value))}
            />
            <button style={{ flex: '0 0 auto' }} disabled={input.length !== 4} onClick={() => relay.receive(input)}>
              Receive
            </button>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>
            iPhones can't take the Pocket 3 over USB. Plug it into the Mac, share from there, and the phone shows the feed behind the words.
          </div>
        </>
      )}
      {relay.mode === 'share' && (
        <>
          <div className="row">
            <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.2em', fontVariantNumeric: 'tabular-nums' }}>{relay.code}</span>
            <span style={{ color: relay.status === 'connected' ? 'var(--ok)' : 'var(--muted)' }}>{statusText}</span>
          </div>
          {qr && <img src={qr} alt="Scan to join" style={{ width: 220, height: 220, borderRadius: 8, alignSelf: 'center' }} />}
          <div style={{ color: 'var(--muted)', fontSize: 12 }}>
            On the phone: scan this, or open the app and enter the code under Settings › Phone monitor. Same Wi‑Fi.
          </div>
          <button onClick={relay.stop}>Stop sharing</button>
        </>
      )}
      {relay.mode === 'receive' && (
        <>
          <div className="row">
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.2em' }}>{relay.code}</span>
            <span style={{ color: relay.status === 'connected' ? 'var(--ok)' : relay.status === 'error' ? 'var(--warn)' : 'var(--muted)' }}>{statusText}</span>
          </div>
          <button onClick={relay.stop}>Disconnect</button>
        </>
      )}
    </>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import Peer, { type DataConnection, type MediaConnection } from 'peerjs'

/**
 * Mac-to-phone camera relay over WebRTC.
 * The Mac ("share") keeps the Pocket 3 on USB and streams it to the phone
 * ("receive"). Signalling goes through the public PeerJS server; the video
 * itself flows peer-to-peer on the local network.
 */

export type RelayMode = 'idle' | 'share' | 'receive'
export type RelayStatus = 'off' | 'connecting' | 'waiting' | 'connected' | 'error'

export interface RelayView {
  mode: RelayMode
  status: RelayStatus
  code: string | null
  error: string | null
  /** Remote stream when receiving. */
  remoteStream: MediaStream | null
  /** Number of phones currently receiving when sharing. */
  viewers: number
  share: (stream: MediaStream) => void
  receive: (code: string) => void
  stop: () => void
}

const PREFIX = 'osmo-prompter-'
const LS_CODE = 'osmo-prompter.relayCode'
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function newCode(): string {
  const a = new Uint8Array(4)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

export function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
}

export function useRelay(): RelayView {
  const [mode, setMode] = useState<RelayMode>('idle')
  const [status, setStatus] = useState<RelayStatus>('off')
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [viewers, setViewers] = useState(0)
  const peerRef = useRef<Peer | null>(null)
  const callsRef = useRef<Set<MediaConnection>>(new Set())
  const streamRef = useRef<MediaStream | null>(null)
  const retryRef = useRef<number | null>(null)
  const wantRef = useRef<{ mode: RelayMode; code: string } | null>(null)

  const teardown = useCallback(() => {
    if (retryRef.current) window.clearTimeout(retryRef.current)
    retryRef.current = null
    callsRef.current.forEach((c) => c.close())
    callsRef.current.clear()
    peerRef.current?.destroy()
    peerRef.current = null
    setRemoteStream(null)
    setViewers(0)
  }, [])

  const stop = useCallback(() => {
    wantRef.current = null
    teardown()
    setMode('idle')
    setStatus('off')
    setCode(null)
    setError(null)
    sessionStorage.removeItem(LS_CODE)
    localStorage.removeItem(LS_CODE)
  }, [teardown])

  const fail = useCallback((msg: string) => {
    setError(msg)
    setStatus('error')
  }, [])

  // Keep the shared stream current (camera switch while sharing).
  const share = useCallback(
    (stream: MediaStream) => {
      streamRef.current = stream
      // Replace tracks on existing calls so a camera switch doesn't drop viewers.
      callsRef.current.forEach((c) => {
        const sender = c.peerConnection?.getSenders().find((s) => s.track?.kind === 'video')
        const track = stream.getVideoTracks()[0]
        if (sender && track) sender.replaceTrack(track).catch(() => {})
      })
      if (peerRef.current) return
      const c = newCode()
      wantRef.current = { mode: 'share', code: c }
      setMode('share')
      setCode(c)
      setStatus('connecting')
      setError(null)
      const peer = new Peer(PREFIX + c)
      peerRef.current = peer
      peer.on('open', () => setStatus('waiting'))
      peer.on('error', (e) => fail(String(e.type ?? e)))
      peer.on('connection', (conn: DataConnection) => {
        conn.on('open', () => {
          const s = streamRef.current
          if (!s) return
          const call = peer.call(conn.peer, s)
          callsRef.current.add(call)
          setViewers(callsRef.current.size)
          setStatus('connected')
          // Send at 1080p to keep Mac CPU sane; it's a monitor, not the recording.
          call.on('stream', () => {})
          setTimeout(() => {
            const sender = call.peerConnection?.getSenders().find((x) => x.track?.kind === 'video')
            if (!sender) return
            const p = sender.getParameters()
            p.encodings = p.encodings?.length ? p.encodings : [{}]
            p.encodings[0].scaleResolutionDownBy = 2
            p.encodings[0].maxBitrate = 8_000_000
            sender.setParameters(p).catch(() => {})
          }, 500)
          const gone = () => {
            callsRef.current.delete(call)
            setViewers(callsRef.current.size)
            if (callsRef.current.size === 0) setStatus('waiting')
          }
          call.on('close', gone)
          call.on('error', gone)
          conn.on('close', () => {
            call.close()
            gone()
          })
        })
      })
    },
    [fail],
  )

  const receive = useCallback(
    (raw: string) => {
      const c = normalizeCode(raw)
      if (c.length !== 4) return
      teardown()
      wantRef.current = { mode: 'receive', code: c }
      sessionStorage.setItem(LS_CODE, c)
      setMode('receive')
      setCode(c)
      setStatus('connecting')
      setError(null)
      const peer = new Peer()
      peerRef.current = peer
      peer.on('error', (e) => {
        const t = String(e.type ?? e)
        // The Mac isn't sharing (yet): keep retrying quietly.
        if (t === 'peer-unavailable') {
          setStatus('waiting')
          retryRef.current = window.setTimeout(() => wantRef.current && receive(c), 3000)
          return
        }
        fail(t)
      })
      peer.on('open', () => {
        const conn = peer.connect(PREFIX + c)
        conn.on('close', () => {
          setRemoteStream(null)
          setStatus('waiting')
          retryRef.current = window.setTimeout(() => wantRef.current && receive(c), 2000)
        })
      })
      peer.on('call', (call) => {
        call.answer()
        callsRef.current.add(call)
        call.on('stream', (s) => {
          setRemoteStream(s)
          setStatus('connected')
        })
        call.on('close', () => {
          setRemoteStream(null)
          setStatus('waiting')
        })
      })
    },
    [teardown, fail],
  )

  // Auto-join from ?join=CODE or a remembered code.
  useEffect(() => {
    const url = new URL(window.location.href)
    const fromUrl = url.searchParams.get('join')
    // Remembered only for this tab session: a stale code must not hijack the camera later.
    const remembered = sessionStorage.getItem(LS_CODE)
    localStorage.removeItem(LS_CODE)
    const c = fromUrl ?? remembered
    if (c && normalizeCode(c).length === 4) {
      if (fromUrl) {
        url.searchParams.delete('join')
        window.history.replaceState(null, '', url.pathname + url.search)
      }
      receive(c)
    }
    return () => teardown()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { mode, status, code, error, remoteStream, viewers, share, receive, stop }
}

import { useCallback, useEffect, useRef, useState } from 'react'

export type SpeechStatus = 'unsupported' | 'idle' | 'listening' | 'error'

export interface TranscriptChunk {
  text: string
  isFinal: boolean
  confidence?: number
  /** performance.now() when the result event fired. */
  at: number
}

export interface UseSpeechResult {
  status: SpeechStatus
  error: string | null
  /** Confirmed text, accumulated since start. */
  finals: TranscriptChunk[]
  /** Current unconfirmed hypothesis (replaced on every result event). */
  interim: string
  /** Every result event, newest last. Capped; for the debug panel. */
  log: TranscriptChunk[]
  /** ms between the last two result events; a rough latency/cadence feel. */
  lastGapMs: number | null
  start: () => void
  stop: () => void
  clear: () => void
  /** Audio input devices (labels need a prior getUserMedia grant). */
  mics: MediaDeviceInfo[]
  micId: string | null
  setMicId: (id: string) => void
}

const LS_MIC = 'osmo-prompter.micDeviceId'
const LOG_CAP = 200

type SR = SpeechRecognition
type SRCtor = new () => SR

function getCtor(): SRCtor | null {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Web Speech API wrapper. Chrome only; audio goes to Google's recognizer.
 *
 * Caveat: the API gives no way to choose the input device. It uses the
 * system/Chrome default mic. We open a getUserMedia stream on the chosen mic
 * anyway so that (a) labels populate and (b) Chrome treats that device as the
 * active capture, which in practice steers recognition to it on macOS.
 */
export function useSpeech(lang = 'en-US'): UseSpeechResult {
  const Ctor = getCtor()
  const [status, setStatus] = useState<SpeechStatus>(Ctor ? 'idle' : 'unsupported')
  const [error, setError] = useState<string | null>(null)
  const [finals, setFinals] = useState<TranscriptChunk[]>([])
  const [interim, setInterim] = useState('')
  const [log, setLog] = useState<TranscriptChunk[]>([])
  const [lastGapMs, setLastGap] = useState<number | null>(null)
  const [mics, setMics] = useState<MediaDeviceInfo[]>([])
  const [micId, setMicIdState] = useState<string | null>(() => localStorage.getItem(LS_MIC))

  const recRef = useRef<SR | null>(null)
  const wantRef = useRef(false) // user intent: keep listening across auto-stops
  const lastAtRef = useRef<number | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)

  const refreshMics = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices()
    const list = all.filter((d) => d.kind === 'audioinput')
    setMics(list)
    setMicIdState((cur) => {
      if (cur && list.some((d) => d.deviceId === cur)) return cur
      const dji = list.find((d) => /dji|osmo|pocket/i.test(d.label))
      return dji?.deviceId ?? list[0]?.deviceId ?? null
    })
  }, [])

  useEffect(() => {
    refreshMics()
    navigator.mediaDevices.addEventListener('devicechange', refreshMics)
    return () => navigator.mediaDevices.removeEventListener('devicechange', refreshMics)
  }, [refreshMics])

  const setMicId = useCallback((id: string) => {
    localStorage.setItem(LS_MIC, id)
    setMicIdState(id)
  }, [])

  const openMic = useCallback(async () => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current = null
    if (!micId) return
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: micId } },
      })
      await refreshMics()
    } catch (e) {
      console.warn('[useSpeech] mic open failed', e)
    }
  }, [micId, refreshMics])

  const buildRec = useCallback(() => {
    if (!Ctor) return null
    const rec = new Ctor()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onstart = () => setStatus('listening')
    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      // 'no-speech' and 'aborted' are routine; keep going.
      if (ev.error === 'no-speech' || ev.error === 'aborted') return
      setError(ev.error)
      setStatus('error')
      wantRef.current = false
    }
    rec.onend = () => {
      recRef.current = null
      if (wantRef.current) {
        // Chrome stops after ~60s of continuous audio or on silence; restart.
        try {
          const next = buildRec()
          if (next) {
            recRef.current = next
            next.start()
          }
        } catch (e) {
          setError(String(e))
          setStatus('error')
        }
      } else {
        setStatus('idle')
      }
    }
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      const now = performance.now()
      if (lastAtRef.current != null) setLastGap(now - lastAtRef.current)
      lastAtRef.current = now
      let interimText = ''
      const newFinals: TranscriptChunk[] = []
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        const alt = r[0]
        const chunk: TranscriptChunk = { text: alt.transcript.trim(), isFinal: r.isFinal, confidence: alt.confidence, at: now }
        if (r.isFinal) newFinals.push(chunk)
        else interimText += alt.transcript
      }
      setInterim(interimText.trim())
      if (newFinals.length) setFinals((f) => [...f, ...newFinals])
      setLog((l) => {
        const next = [...l, ...newFinals]
        if (interimText.trim()) next.push({ text: interimText.trim(), isFinal: false, at: now })
        return next.length > LOG_CAP ? next.slice(-LOG_CAP) : next
      })
    }
    return rec
  }, [Ctor, lang])

  const start = useCallback(() => {
    if (!Ctor || recRef.current) return
    setError(null)
    wantRef.current = true
    lastAtRef.current = null
    openMic().finally(() => {
      const rec = buildRec()
      if (!rec) return
      recRef.current = rec
      try {
        rec.start()
      } catch (e) {
        setError(String(e))
        setStatus('error')
      }
    })
  }, [Ctor, buildRec, openMic])

  const stop = useCallback(() => {
    wantRef.current = false
    recRef.current?.stop()
    recRef.current = null
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    micStreamRef.current = null
    setInterim('')
    setStatus(Ctor ? 'idle' : 'unsupported')
  }, [Ctor])

  const clear = useCallback(() => {
    setFinals([])
    setInterim('')
    setLog([])
    setLastGap(null)
  }, [])

  useEffect(() => () => stop(), [stop])

  return { status, error, finals, interim, log, lastGapMs, start, stop, clear, mics, micId, setMicId }
}

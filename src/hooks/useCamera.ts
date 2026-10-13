import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'live' | 'error'

export interface StreamInfo {
  width?: number
  height?: number
  frameRate?: number
  deviceLabel?: string
  deviceId?: string
  /** 'user' for a front/selfie camera, 'environment' for rear, else undefined. */
  facingMode?: string
  /** Advertised ranges from track.getCapabilities(), when the browser exposes them. */
  caps?: { width?: ULongRange; height?: ULongRange; frameRate?: DoubleRange }
}

export interface UseCameraResult {
  devices: MediaDeviceInfo[]
  deviceId: string | null
  setDeviceId: (id: string) => void
  stream: MediaStream | null
  info: StreamInfo | null
  status: CameraStatus
  error: string | null
  refreshDevices: () => Promise<void>
  stop: () => void
  /** Requested frame rate; the camera may negotiate something else (see info.frameRate). */
  fps: number
  setFps: (fps: number) => void
}

const LS_KEY = 'osmo-prompter.cameraDeviceId'
const LS_FPS = 'osmo-prompter.fps'

/** Prefer the saved choice, then a DJI, then a front camera (phones), then the first camera. */
function pickDefault(devices: MediaDeviceInfo[]): string | null {
  const saved = localStorage.getItem(LS_KEY)
  if (saved && devices.some((d) => d.deviceId === saved)) return saved
  const dji = devices.find((d) => /dji|osmo|pocket/i.test(d.label))
  if (dji) return dji.deviceId
  const front = devices.find((d) => /front|user|facetime|selfie/i.test(d.label))
  return front?.deviceId ?? devices[0]?.deviceId ?? null
}

/** `enabled` false: no permission prompt, no stream, no enumeration. Camera is opt-in. */
export function useCamera(enabled: boolean): UseCameraResult {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceIdState] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [info, setInfo] = useState<StreamInfo | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [fps, setFpsState] = useState<number>(() => Number(localStorage.getItem(LS_FPS)) || 30)
  const [reopen, setReopen] = useState(0)

  const setFps = useCallback((f: number) => {
    localStorage.setItem(LS_FPS, String(f))
    setFpsState(f)
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
    setInfo(null)
    setStatus('idle')
  }, [])

  const refreshDevices = useCallback(async () => {
    const all = await navigator.mediaDevices.enumerateDevices()
    const cams = all.filter((d) => d.kind === 'videoinput')
    setDevices(cams)
    setDeviceIdState((cur) => (cur && cams.some((d) => d.deviceId === cur) ? cur : pickDefault(cams)))
  }, [])

  const setDeviceId = useCallback((id: string) => {
    localStorage.setItem(LS_KEY, id)
    setDeviceIdState(id)
  }, [])

  // Initial permission + enumeration. Labels are empty until permission is granted,
  // so we open a throwaway stream first.
  useEffect(() => {
    if (!enabled) {
      stop()
      setDevices([])
      setError(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setStatus('requesting')
        const probe = await navigator.mediaDevices.getUserMedia({ video: true })
        probe.getTracks().forEach((t) => t.stop())
        if (!cancelled) await refreshDevices()
      } catch (e) {
        if (!cancelled) {
          setStatus('error')
          setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e))
        }
      }
    })()
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices)
    return () => {
      cancelled = true
      navigator.mediaDevices.removeEventListener('devicechange', refreshDevices)
    }
  }, [enabled, refreshDevices, stop])

  // Open the chosen device, asking for 4K.
  useEffect(() => {
    if (!enabled || !deviceId) return
    let cancelled = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setStatus('requesting')
    setError(null)
    ;(async () => {
      try {
        const base = { deviceId: { exact: deviceId }, width: { ideal: 3840 }, height: { ideal: 2160 } }
        let s: MediaStream
        try {
          // Ask for the exact rate first so the browser must pick a matching UVC mode.
          s = await navigator.mediaDevices.getUserMedia({
            video: { ...base, frameRate: { exact: fps } },
            audio: false,
          })
        } catch (e) {
          if (!(e instanceof Error) || e.name !== 'OverconstrainedError') throw e
          console.warn(`[useCamera] ${fps}fps not available at 4K, falling back to ideal`)
          s = await navigator.mediaDevices.getUserMedia({
            video: { ...base, frameRate: { ideal: fps } },
            audio: false,
          })
        }
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = s
        setStream(s)
        setStatus('live')
        const track = s.getVideoTracks()[0]
        const read = () => {
          const st = track.getSettings()
          const c = typeof track.getCapabilities === 'function' ? track.getCapabilities() : undefined
          setInfo({
            width: st.width,
            height: st.height,
            frameRate: st.frameRate,
            deviceLabel: track.label,
            deviceId: st.deviceId,
            facingMode: st.facingMode,
            caps: c ? { width: c.width, height: c.height, frameRate: c.frameRate } : undefined,
          })
          console.log('[useCamera] settings', st, 'capabilities', c)
        }
        read()
        // Some UVC devices renegotiate shortly after start; re-read once.
        setTimeout(() => !cancelled && read(), 1500)
        track.addEventListener('ended', () => {
          if (cancelled) return
          // iOS ends the camera when another capture starts; try once to get it back.
          setStatus('idle')
          setTimeout(() => {
            if (!cancelled && streamRef.current === s) setReopen((n) => n + 1)
          }, 800)
        })
      } catch (e) {
        if (!cancelled) {
          setStatus('error')
          setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, deviceId, fps, reopen])

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), [])

  return { devices, deviceId, setDeviceId, stream, info, status, error, refreshDevices, stop, fps, setFps }
}

import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraStatus = 'idle' | 'requesting' | 'live' | 'error'

export interface StreamInfo {
  width?: number
  height?: number
  frameRate?: number
  deviceLabel?: string
  deviceId?: string
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
}

const LS_KEY = 'osmo-prompter.cameraDeviceId'

/** Prefer the DJI if present, else the saved choice, else the first camera. */
function pickDefault(devices: MediaDeviceInfo[]): string | null {
  const saved = localStorage.getItem(LS_KEY)
  if (saved && devices.some((d) => d.deviceId === saved)) return saved
  const dji = devices.find((d) => /dji|osmo|pocket/i.test(d.label))
  return dji?.deviceId ?? devices[0]?.deviceId ?? null
}

export function useCamera(): UseCameraResult {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceIdState] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [info, setInfo] = useState<StreamInfo | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

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
  }, [refreshDevices])

  // Open the chosen device, asking for 4K.
  useEffect(() => {
    if (!deviceId) return
    let cancelled = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setStatus('requesting')
    setError(null)
    ;(async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: deviceId },
            width: { ideal: 3840 },
            height: { ideal: 2160 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        })
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
          setInfo({
            width: st.width,
            height: st.height,
            frameRate: st.frameRate,
            deviceLabel: track.label,
            deviceId: st.deviceId,
          })
        }
        read()
        // Some UVC devices renegotiate shortly after start; re-read once.
        setTimeout(() => !cancelled && read(), 1500)
        track.addEventListener('ended', () => !cancelled && setStatus('idle'))
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
  }, [deviceId])

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), [])

  return { devices, deviceId, setDeviceId, stream, info, status, error, refreshDevices, stop }
}

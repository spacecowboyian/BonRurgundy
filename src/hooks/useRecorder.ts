import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Record the stream shown behind the words with MediaRecorder.
 *
 * Desktop Chrome/Edge: asks where to save up front (File System Access API)
 * and streams chunks straight to disk, so long takes don't live in memory.
 * Everywhere else (Safari, iOS): chunks are kept in memory and offered via
 * the share sheet or a download when you stop. Takes are capped to protect
 * phone memory.
 */

export type RecStatus = 'idle' | 'starting' | 'recording' | 'stopping' | 'error'

export interface RecorderView {
  supported: boolean
  status: RecStatus
  seconds: number
  error: string | null
  /** True when the browser can pick a save location up front. */
  canPickFile: boolean
  start: () => Promise<void>
  stop: () => Promise<void>
  /** Soft cap in seconds for in-memory recording (0 = none). */
  maxSeconds: number
}

const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const MEMORY_CAP_SECONDS = 10 * 60

function pickMime(): string {
  const candidates = [
    'video/mp4;codecs=avc1.640028,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const c of candidates) if (MediaRecorder.isTypeSupported?.(c)) return c
  return ''
}

function stamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

interface SaveTarget {
  writable?: FileSystemWritableFileStream
  chunks: Blob[]
  mime: string
  ext: string
}

export function useRecorder(video: MediaStream | null, micDeviceId: string | null): RecorderView {
  const supported = typeof MediaRecorder !== 'undefined'
  const canPickFile = typeof (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker === 'function'
  const [status, setStatus] = useState<RecStatus>('idle')
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const targetRef = useRef<SaveTarget | null>(null)
  const audioRef = useRef<MediaStream | null>(null)
  const tickRef = useRef<number | null>(null)
  const startedAt = useRef(0)
  const maxSeconds = canPickFile ? 0 : MEMORY_CAP_SECONDS

  const cleanupAudio = () => {
    audioRef.current?.getTracks().forEach((t) => t.stop())
    audioRef.current = null
  }

  const finish = useCallback(async () => {
    const t = targetRef.current
    targetRef.current = null
    if (tickRef.current) window.clearInterval(tickRef.current)
    tickRef.current = null
    cleanupAudio()
    if (!t) {
      setStatus('idle')
      return
    }
    try {
      if (t.writable) {
        await t.writable.close()
      } else {
        const blob = new Blob(t.chunks, { type: t.mime })
        const name = `bonrurgundy-${stamp()}.${t.ext}`
        const file = new File([blob], name, { type: t.mime })
        const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
        if (IS_IOS && nav.share && nav.canShare?.({ files: [file] })) {
          try {
            await nav.share({ files: [file], title: name })
          } catch {
            /* user dismissed the sheet; fall through to download */
            downloadBlob(blob, name)
          }
        } else {
          downloadBlob(blob, name)
        }
      }
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [])

  const stop = useCallback(async () => {
    const r = recRef.current
    if (!r || r.state === 'inactive') return
    setStatus('stopping')
    await new Promise<void>((resolve) => {
      r.addEventListener('stop', () => resolve(), { once: true })
      r.stop()
    })
    recRef.current = null
    await finish()
  }, [finish])

  const start = useCallback(async () => {
    if (!supported || !video || recRef.current) return
    setError(null)
    setStatus('starting')
    try {
      const mime = pickMime()
      const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm'
      const target: SaveTarget = { chunks: [], mime, ext }

      // Desktop: pick the destination first and stream to it.
      if (canPickFile) {
        const picker = (window as unknown as { showSaveFilePicker: (o: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker
        const handle = await picker({
          suggestedName: `bonrurgundy-${stamp()}.${ext}`,
          types: [{ description: 'Video', accept: { [mime.split(';')[0] || 'video/webm']: [`.${ext}`] } }],
        })
        target.writable = await handle.createWritable()
      }

      // Audio: add the chosen mic. On iOS a second capture can collide with the
      // speech recognizer; try, and fall back to video-only.
      const tracks: MediaStreamTrack[] = [...video.getVideoTracks()]
      try {
        const a = await navigator.mediaDevices.getUserMedia({
          audio: micDeviceId ? { deviceId: { ideal: micDeviceId } } : true,
          video: false,
        })
        audioRef.current = a
        tracks.push(...a.getAudioTracks())
      } catch (e) {
        console.warn('[useRecorder] no audio track', e)
      }
      const stream = new MediaStream(tracks)
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 12_000_000 } : undefined)
      rec.ondataavailable = async (ev) => {
        if (!ev.data.size) return
        if (target.writable) {
          try {
            await target.writable.write(ev.data)
          } catch (e) {
            console.warn('[useRecorder] write failed', e)
          }
        } else {
          target.chunks.push(ev.data)
        }
      }
      rec.onerror = (ev) => {
        setError(String((ev as unknown as { error?: Error }).error?.message ?? 'recording error'))
        setStatus('error')
      }
      targetRef.current = target
      recRef.current = rec
      rec.start(1000) // 1s chunks
      startedAt.current = Date.now()
      setSeconds(0)
      setStatus('recording')
      tickRef.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - startedAt.current) / 1000)
        setSeconds(s)
        if (maxSeconds && s >= maxSeconds) void stop()
      }, 500)
    } catch (e) {
      cleanupAudio()
      targetRef.current = null
      if (e instanceof Error && e.name === 'AbortError') {
        setStatus('idle') // user cancelled the save dialog
        return
      }
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }, [supported, video, micDeviceId, canPickFile, maxSeconds, stop])

  // If the camera stream goes away mid-take, stop cleanly.
  useEffect(() => {
    if (!video && recRef.current) void stop()
  }, [video, stop])

  useEffect(() => () => {
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    cleanupAudio()
  }, [])

  return { supported, status, seconds, error, canPickFile, start, stop, maxSeconds }
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

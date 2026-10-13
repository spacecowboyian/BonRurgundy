import { useEffect, useRef } from 'react'

interface Props {
  stream: MediaStream | null
  mirror?: boolean
}

export function VideoLayer({ stream, mirror = false }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.srcObject = stream
    if (stream) v.play().catch(() => {})
  }, [stream])
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
        transform: mirror ? 'scaleX(-1)' : undefined,
      }}
    />
  )
}

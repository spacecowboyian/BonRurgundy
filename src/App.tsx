import { useEffect, useState } from 'react'
import { useCamera } from './hooks/useCamera'
import { VideoLayer } from './components/VideoLayer'
import { CameraHud } from './components/CameraHud'

export default function App() {
  const cam = useCamera()
  const [mirror, setMirror] = useState(false)
  const [hudHidden, setHudHidden] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement) return
      switch (e.key.toLowerCase()) {
        case 'h':
          setHudHidden((v) => !v)
          break
        case 'm':
          setMirror((v) => !v)
          break
        case 'f':
          if (document.fullscreenElement) document.exitFullscreen()
          else document.documentElement.requestFullscreen()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <VideoLayer stream={cam.stream} mirror={mirror} />
      <CameraHud cam={cam} mirror={mirror} onToggleMirror={() => setMirror((v) => !v)} hidden={hudHidden} />
    </>
  )
}

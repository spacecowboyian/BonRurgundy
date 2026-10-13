import { useEffect, useMemo, useRef, useState } from 'react'
import { useCamera } from './hooks/useCamera'
import { usePrompterControl } from './hooks/usePrompterControl'
import { useSpeech } from './hooks/useSpeech'
import { useAligner } from './hooks/useAligner'
import { useLocalState } from './lib/storage'
import { parseScript } from './lib/script'
import { SAMPLE_SCRIPT } from './data/sampleScript'
import { VideoLayer } from './components/VideoLayer'
import { CameraHud } from './components/CameraHud'
import { ScriptEditor } from './components/ScriptEditor'
import { SpeechPanel } from './components/SpeechPanel'
import { DEFAULT_PREFS, Prompter, type PrompterPrefs } from './components/Prompter'

export default function App() {
  const cam = useCamera()
  const [scriptText, setScriptText] = useLocalState('osmo-prompter.script', SAMPLE_SCRIPT)
  const [prefs, setPrefs] = useLocalState<PrompterPrefs>('osmo-prompter.prefs', DEFAULT_PREFS)
  const [editing, setEditing] = useState(() => !scriptText.trim())
  const [hudHidden, setHudHidden] = useState(false)
  const [speechHidden, setSpeechHidden] = useState(false)
  const speech = useSpeech()

  const script = useMemo(() => parseScript(scriptText), [scriptText])
  const ctl = usePrompterControl(script.words.length)
  const aligner = useAligner(script, speech, ctl)

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) {
        if (e.key === 'Escape') setEditing(false)
        return
      }
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          ctl.togglePlay()
          break
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          ctl.nudgeLines(e.shiftKey ? 4 : 1)
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          ctl.nudgeLines(e.shiftKey ? -4 : -1)
          break
        case '+':
        case '=':
          ctl.setWpm((w) => w + 10)
          break
        case '-':
        case '_':
          ctl.setWpm((w) => w - 10)
          break
        case ']':
          setPrefs((p) => ({ ...p, fontSize: Math.min(120, p.fontSize + 4) }))
          break
        case '[':
          setPrefs((p) => ({ ...p, fontSize: Math.max(24, p.fontSize - 4) }))
          break
        case 'Home':
          ctl.reset()
          break
        case 'e':
        case 'E':
          setEditing(true)
          break
        case 'h':
        case 'H':
          setHudHidden((v) => !v)
          break
        case 'm':
        case 'M':
          setPrefs((p) => ({ ...p, mirror: !p.mirror }))
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'v':
        case 'V':
          speech.status === 'listening' ? speech.stop() : speech.start()
          break
        case 't':
        case 'T':
          setSpeechHidden((v) => !v)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, ctl, setPrefs, speech])

  // Wheel / trackpad / touch scrolling on the text. Pixels are converted to
  // words using the current font size so the feel stays constant across sizes.
  const scrollAcc = useRef(0)
  const touchY = useRef<number | null>(null)
  useEffect(() => {
    const pxPerWord = () => (prefs.fontSize * 1.35) / 7 // ~7 words per line
    const applyDelta = (dy: number) => {
      scrollAcc.current += dy
      const words = Math.trunc(scrollAcc.current / pxPerWord())
      if (words !== 0) {
        scrollAcc.current -= words * pxPerWord()
        ctl.nudge(words)
      }
    }
    const onWheel = (e: WheelEvent) => {
      if (editing) return
      if ((e.target as HTMLElement).closest?.('input,select,button')) return
      e.preventDefault()
      applyDelta(e.deltaY)
    }
    const onTouchStart = (e: TouchEvent) => {
      if (editing) return
      touchY.current = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      if (editing || touchY.current == null) return
      const y = e.touches[0].clientY
      applyDelta(touchY.current - y) // swipe up = advance
      touchY.current = y
    }
    const onTouchEnd = () => {
      touchY.current = null
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [editing, ctl, prefs.fontSize])

  return (
    <>
      <VideoLayer stream={cam.stream} mirror={prefs.mirror} />
      <Prompter script={script} cursor={ctl.cursor} prefs={prefs} status={speech.status === 'listening' && aligner.enabled ? (aligner.held ? 'held' : aligner.state.status) : null}
        onLines={ctl.setLines} />
      <CameraHud
        cam={cam}
        prefs={prefs}
        setPrefs={setPrefs}
        ctl={ctl}
        wordCount={script.words.length}
        onEdit={() => setEditing(true)}
        onFullscreen={toggleFullscreen}
        hidden={hudHidden}
      />
      <SpeechPanel speech={speech} aligner={aligner} hidden={hudHidden || speechHidden} />
      {editing && <ScriptEditor text={scriptText} onChange={setScriptText} onClose={() => setEditing(false)} />}
    </>
  )
}

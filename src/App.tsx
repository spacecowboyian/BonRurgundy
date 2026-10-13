import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCamera } from './hooks/useCamera'
import { usePrompterControl } from './hooks/usePrompterControl'
import { useSpeech } from './hooks/useSpeech'
import { useAligner } from './hooks/useAligner'
import { useRelay } from './hooks/useRelay'
import { useLocalState } from './lib/storage'
import { parseScript } from './lib/script'
import { VideoLayer } from './components/VideoLayer'
import { Hud } from './components/Hud'
import { MicButton } from './components/MicButton'
import { PlayButton } from './components/PlayButton'
import { SettingsSheet } from './components/SettingsSheet'
import { ScriptEditor } from './components/ScriptEditor'
import { SpeechPanel } from './components/SpeechPanel'
import { DEFAULT_PREFS, Prompter, fontPx, type PrompterPrefs } from './components/Prompter'

export default function App() {
  const [cameraOn, setCameraOn] = useLocalState('osmo-prompter.cameraOn', false)
  const cam = useCamera(cameraOn)
  const speech = useSpeech()
  const relay = useRelay()
  const [scriptText, setScriptText] = useLocalState('osmo-prompter.script', '')
  const [prefs, setPrefsRaw] = useLocalState<PrompterPrefs>('osmo-prompter.prefs2', DEFAULT_PREFS)
  // Older builds stored font size in px; anything over 20 can't be a vh value.
  useEffect(() => {
    if (prefs.fontSize > 20) setPrefsRaw((p) => ({ ...p, fontSize: DEFAULT_PREFS.fontSize }))
  }, [prefs.fontSize, setPrefsRaw])
  const setPrefs = setPrefsRaw
  const [editing, setEditing] = useState(() => !scriptText.trim())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hudHidden, setHudHidden] = useState(true)
  const [debugOpen, setDebugOpen] = useState(false)

  // Receiving from the Mac: release the phone's own camera.
  useEffect(() => {
    if (relay.mode === 'receive') cam.stop()
  }, [relay.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // While sharing, follow camera switches.
  useEffect(() => {
    if (relay.mode === 'share' && cam.stream) relay.share(cam.stream)
  }, [relay.mode, cam.stream]) // eslint-disable-line react-hooks/exhaustive-deps

  const script = useMemo(() => parseScript(scriptText), [scriptText])
  const ctl = usePrompterControl(script.words.length)
  const aligner = useAligner(script, speech, ctl)

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  // Showing any interface pauses listening; hiding it again resumes.
  const uiOpen = !hudHidden || settingsOpen || editing
  const resumeOnHide = useRef(false)
  const listening = speech.status === 'listening'
  useEffect(() => {
    if (uiOpen && listening) {
      resumeOnHide.current = true
      speech.stop()
    } else if (!uiOpen && !listening && resumeOnHide.current) {
      resumeOnHide.current = false
      speech.start()
    }
  }, [uiOpen, listening, speech])

  // Fixed-speed play and voice follow would fight over the cursor: one at a time.
  const togglePlay = useCallback(() => {
    if (!ctl.playing) {
      resumeOnHide.current = false
      if (listening) speech.stop()
    }
    ctl.togglePlay()
  }, [ctl, listening, speech])

  const toggleMic = useCallback(() => {
    if (listening) {
      resumeOnHide.current = false
      speech.stop()
    } else {
      resumeOnHide.current = false
      if (ctl.playing) ctl.togglePlay()
      setHudHidden(true)
      setSettingsOpen(false)
      speech.start()
    }
  }, [listening, speech, ctl])

  // A tap/click on the words or video toggles the bars. A drag is a scroll, not a tap.
  const ptr = useRef<{ x: number; y: number; t: number } | null>(null)
  useEffect(() => {
    const isChrome = (el: EventTarget | null) => (el as HTMLElement)?.closest?.('.bar,.sheet,.sheet-backdrop,.editor,.tap,.play,.mic,button,input,select,label')
    const onDown = (e: PointerEvent) => {
      if (editing || settingsOpen || isChrome(e.target)) return
      ptr.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    }
    const onUp = (e: PointerEvent) => {
      const p = ptr.current
      ptr.current = null
      if (!p || isChrome(e.target)) return
      const moved = Math.hypot(e.clientX - p.x, e.clientY - p.y)
      if (moved < 12 && performance.now() - p.t < 500) setHudHidden((v) => !v)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [editing, settingsOpen])

  const closeEditor = useCallback(() => {
    if (!scriptText.trim()) return
    setEditing(false)
    setHudHidden(true)
    ctl.reset()
  }, [scriptText, ctl])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) {
        if (e.key === 'Escape') closeEditor()
        return
      }
      if (settingsOpen) {
        if (e.key === 'Escape') setSettingsOpen(false)
        return
      }
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
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
          setPrefs((p) => ({ ...p, fontSize: Math.min(30, p.fontSize + 0.5) }))
          break
        case '[':
          setPrefs((p) => ({ ...p, fontSize: Math.max(3, p.fontSize - 0.5) }))
          break
        case 'Home':
          ctl.reset()
          break
        case 'e':
        case 'E':
          e.preventDefault()
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
          toggleMic()
          break
        case 't':
        case 'T':
          setDebugOpen((v) => !v)
          break
        case ',':
          setSettingsOpen((v) => !v)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, settingsOpen, closeEditor, ctl, setPrefs, toggleMic, togglePlay, toggleFullscreen])

  // Wheel / trackpad / touch scrolling on the text. Pixels are converted to
  // words using the current font size so the feel stays constant across sizes.
  const scrollAcc = useRef(0)
  const touchY = useRef<number | null>(null)
  useEffect(() => {
    const blocked = () => editing || settingsOpen
    const pxPerWord = () => (fontPx(prefs) * 1.2) / 5 // ~7 words per line
    const applyDelta = (dy: number) => {
      scrollAcc.current += dy
      const words = Math.trunc(scrollAcc.current / pxPerWord())
      if (words !== 0) {
        scrollAcc.current -= words * pxPerWord()
        ctl.nudge(words)
      }
    }
    const onWheel = (e: WheelEvent) => {
      if (blocked()) return
      if ((e.target as HTMLElement).closest?.('input,select,button,.bar,.sheet')) return
      e.preventDefault()
      applyDelta(e.deltaY)
    }
    const onTouchStart = (e: TouchEvent) => {
      if (blocked()) return
      if ((e.target as HTMLElement).closest?.('.bar,.sheet')) return
      touchY.current = e.touches[0].clientY
    }
    const onTouchMove = (e: TouchEvent) => {
      if (blocked() || touchY.current == null) return
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
  }, [editing, settingsOpen, ctl, prefs])

  const voiceStatus = speech.status === 'listening' && aligner.enabled ? (aligner.held ? 'held' : aligner.state.status) : null

  return (
    <>
      {/* Front cameras get a selfie-style mirrored preview; the text is only mirrored for beam-splitter glass. */}
      <VideoLayer
        stream={relay.mode === 'receive' ? relay.remoteStream : cam.stream}
        mirror={prefs.mirror !== (relay.mode !== 'receive' && cam.info?.facingMode === 'user')}
      />
      <Prompter script={script} cursor={ctl.cursor} prefs={prefs} status={voiceStatus} onLines={ctl.setLines} />
      <Hud
        ctl={ctl}
        wordCount={script.words.length}
        hidden={hudHidden}
        onEdit={() => setEditing(true)}
        onSettings={() => setSettingsOpen(true)}
      />
      {!editing && <PlayButton playing={ctl.playing} onClick={togglePlay} />}
      {!editing && (
        <MicButton listening={listening} disabled={speech.status === 'unsupported'} onClick={toggleMic} />
      )}
      {debugOpen && <SpeechPanel speech={speech} aligner={aligner} hidden={false} />}
      {settingsOpen && (
        <SettingsSheet
          cam={cam}
          cameraOn={cameraOn}
          setCameraOn={setCameraOn}
          relay={relay}
          speech={speech}
          aligner={aligner}
          ctl={ctl}
          prefs={prefs}
          setPrefs={setPrefs}
          onClose={() => {
            setSettingsOpen(false)
            setHudHidden(true)
          }}
        />
      )}
      {editing && <ScriptEditor text={scriptText} onChange={setScriptText} onClose={closeEditor} />}
    </>
  )
}

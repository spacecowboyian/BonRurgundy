import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCamera } from './hooks/useCamera'
import { usePrompterControl } from './hooks/usePrompterControl'
import { useSpeech } from './hooks/useSpeech'
import { useAligner } from './hooks/useAligner'
import { useRelay } from './hooks/useRelay'
import { useLocalState } from './lib/storage'
import { parseScript } from './lib/script'
import { SAMPLE_SCRIPT } from './data/sampleScript'
import { tidyScript } from './lib/tidy'
import { fetchScript, scriptUrlFromLocation } from './lib/scriptUrl'
import { VideoLayer } from './components/VideoLayer'
import { Hud } from './components/Hud'
import { MicButton } from './components/MicButton'
import { Transport } from './components/Transport'
import { RightDock } from './components/RightDock'
import { ScrollBar } from './components/ScrollBar'
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
  // One-time migration: devices that opened the PoC got the old private seed
  // script saved to local storage. Swap it for the current sample.
  useEffect(() => {
    if (/^Ladies and gentlemen, brothers and sisters, welcome back to the Church of Combustion/.test(scriptText)) {
      setScriptText(SAMPLE_SCRIPT)
    } else if (/^<p align="center">/.test(scriptText) || /^BonRurgundy is a prompter first\./.test(scriptText)) {
      setScriptText(SAMPLE_SCRIPT) // earlier samples: whole README, or the 'prompter first' section
    } else if (/^A teleprompter that actually listens to you\./.test(scriptText) && scriptText.length > 1500) {
      setScriptText(SAMPLE_SCRIPT) // the whole-README sample
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [prefs, setPrefsRaw] = useLocalState<PrompterPrefs>('osmo-prompter.prefs2', DEFAULT_PREFS)
  // Older builds stored font size in px; anything over 20 can't be a vh value.
  useEffect(() => {
    if (prefs.fontSize > 20) setPrefsRaw((p) => ({ ...p, fontSize: DEFAULT_PREFS.fontSize }))
  }, [prefs.fontSize, setPrefsRaw])
  const setPrefs = setPrefsRaw
  const [editing, setEditing] = useState(() => !scriptText.trim())
  const [loadNote, setLoadNote] = useState<string | null>(null)

  // ?script=<url>: fetch a text/markdown file and open the prompter with it.
  useEffect(() => {
    const url = scriptUrlFromLocation()
    if (!url) return
    setLoadNote('Loading script…')
    setEditing(true)
    fetchScript(url)
      .then((text) => {
        setScriptText(tidyScript(text))
        setLoadNote(null)
        setEditing(false)
        ctl.reset()
      })
      .catch((e) => {
        setLoadNote(`Couldn't load that script link (${e instanceof Error ? e.message : String(e)}). The file must be plain text or markdown and allow cross-origin reads; GitHub, Gist, Pastebin, Google Docs and Dropbox links work.`)
      })
      .finally(() => {
        const u = new URL(window.location.href)
        u.searchParams.delete('script')
        const hash = new URLSearchParams(u.hash.replace(/^#/, ''))
        hash.delete('script')
        u.hash = hash.toString()
        window.history.replaceState(null, '', u.pathname + u.search + (u.hash ? '#' + u.hash.replace(/^#/, '') : ''))
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)

  // Once the Mac's feed actually arrives, release the phone's own camera.
  useEffect(() => {
    if (relay.mode === 'receive' && relay.remoteStream) cam.stop()
  }, [relay.mode, relay.remoteStream]) // eslint-disable-line react-hooks/exhaustive-deps

  // While sharing, follow camera switches.
  useEffect(() => {
    if (relay.mode === 'share' && cam.stream) relay.share(cam.stream)
  }, [relay.mode, cam.stream]) // eslint-disable-line react-hooks/exhaustive-deps

  const script = useMemo(() => parseScript(scriptText), [scriptText])
  const ctl = usePrompterControl(script.words.length)
  useEffect(() => {
    ctl.setParagraphStarts(script.paragraphs.map((p) => p[0].index))
  }, [script]) // eslint-disable-line react-hooks/exhaustive-deps
  const aligner = useAligner(script, speech, ctl, (play) => (play ? (ctl.playing ? undefined : togglePlayRef.current()) : ctl.setPlaying(false)))

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }, [])

  // Showing any interface pauses listening; hiding it again resumes.
  const uiOpen = settingsOpen || editing
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
  const togglePlayRef = useRef<() => void>(() => {})
  const togglePlay = useCallback(() => {
    if (!ctl.playing) {
      resumeOnHide.current = false
      if (listening) speech.stop()
    }
    ctl.togglePlay()
  }, [ctl, listening, speech])
  togglePlayRef.current = togglePlay

  const toggleMic = useCallback(() => {
    if (listening) {
      resumeOnHide.current = false
      speech.stop()
    } else {
      resumeOnHide.current = false
      if (ctl.playing) ctl.togglePlay()
      setSettingsOpen(false)
      speech.start()
    }
  }, [listening, speech, ctl])

  const closeEditor = useCallback(() => {
    if (!scriptText.trim()) return
    setEditing(false)
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
          ctl.toStart()
          break
        case 'End':
          ctl.toEnd()
          break
        case 'PageUp':
          e.preventDefault()
          ctl.nudgeParagraphs(-1)
          break
        case 'PageDown':
          e.preventDefault()
          ctl.nudgeParagraphs(1)
          break
        case 'e':
        case 'E':
          e.preventDefault()
          setEditing(true)
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
      if ((e.target as HTMLElement).closest?.('.bar,.sheet,.scrollbar,.dock,.mic,.donate-sheet')) return
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
  const [lineCount, setLineCount] = useState(1)
  const setLines = ctl.setLines
  const onLines = useCallback(
    (starts: number[]) => {
      setLines(starts)
      setLineCount(Math.max(1, starts.length))
    },
    [setLines],
  )
  const visibleFraction = Math.min(1, window.innerHeight / (fontPx(prefs) * 1.35) / lineCount)

  return (
    <>
      {/* Front cameras get a selfie-style mirrored preview; the text is only mirrored for beam-splitter glass. */}
      <VideoLayer
        stream={relay.remoteStream ?? cam.stream}
        mirror={prefs.mirror !== (!relay.remoteStream && cam.info?.facingMode === 'user')}
      />
      <Prompter script={script} cursor={ctl.cursor} prefs={prefs} status={voiceStatus} onLines={onLines} />
      <Hud
        ctl={ctl}
        cameraNote={cameraOn && cam.status !== 'live' ? (cam.error ? `camera: ${cam.error}` : cam.status === 'requesting' ? 'camera…' : 'camera: no stream') : null}
        wordCount={script.words.length}
        hidden={false}
        onEdit={() => setEditing(true)}
        onSettings={() => setSettingsOpen(true)}
      />
      {!editing && <ScrollBar cursor={ctl.cursor} wordCount={script.words.length} visibleFraction={visibleFraction} onSeek={ctl.setCursor} />}
      {!editing && <RightDock />}
      {!editing && <Transport ctl={ctl} playing={ctl.playing} onTogglePlay={togglePlay} />}
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
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {editing && <ScriptEditor text={scriptText} onChange={setScriptText} onClose={closeEditor} note={loadNote} />}
    </>
  )
}

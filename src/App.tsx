import { useEffect, useMemo, useState } from 'react'
import { useCamera } from './hooks/useCamera'
import { usePrompterControl } from './hooks/usePrompterControl'
import { useLocalState } from './lib/storage'
import { parseScript } from './lib/script'
import { SAMPLE_SCRIPT } from './data/sampleScript'
import { VideoLayer } from './components/VideoLayer'
import { CameraHud } from './components/CameraHud'
import { ScriptEditor } from './components/ScriptEditor'
import { DEFAULT_PREFS, Prompter, type PrompterPrefs } from './components/Prompter'

export default function App() {
  const cam = useCamera()
  const [scriptText, setScriptText] = useLocalState('osmo-prompter.script', SAMPLE_SCRIPT)
  const [prefs, setPrefs] = useLocalState<PrompterPrefs>('osmo-prompter.prefs', DEFAULT_PREFS)
  const [editing, setEditing] = useState(() => !scriptText.trim())
  const [hudHidden, setHudHidden] = useState(false)

  const script = useMemo(() => parseScript(scriptText), [scriptText])
  const ctl = usePrompterControl(script.words.length)

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
      const step = 8 // roughly one line
      switch (e.key) {
        case ' ':
          e.preventDefault()
          ctl.togglePlay()
          break
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          ctl.nudge(e.shiftKey ? step * 4 : step)
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          ctl.nudge(e.shiftKey ? -step * 4 : -step)
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
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, ctl, setPrefs])

  return (
    <>
      <VideoLayer stream={cam.stream} mirror={prefs.mirror} />
      <Prompter script={script} cursor={ctl.cursor} prefs={prefs} />
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
      {editing && <ScriptEditor text={scriptText} onChange={setScriptText} onClose={() => setEditing(false)} />}
    </>
  )
}

import type { UseCameraResult } from '../hooks/useCamera'
import type { RelayView } from '../hooks/useRelay'
import { RelayPanel } from './RelayPanel'
import type { PrompterControl } from '../hooks/usePrompterControl'
import type { UseSpeechResult } from '../hooks/useSpeech'
import type { AlignerView } from '../hooks/useAligner'
import { fontPx, type PrompterPrefs } from './Prompter'

interface Props {
  cam: UseCameraResult
  cameraOn: boolean
  setCameraOn: (v: boolean) => void
  relay: RelayView
  speech: UseSpeechResult
  aligner: AlignerView
  ctl: PrompterControl
  prefs: PrompterPrefs
  setPrefs: (f: (p: PrompterPrefs) => PrompterPrefs) => void
  onClose: () => void
}

export function SettingsSheet({ cam, cameraOn, setCameraOn, relay, speech, aligner, ctl, prefs, setPrefs, onClose }: Props) {
  const capsText = cam.info?.caps
    ? `device offers up to ${cam.info.caps.width?.max ?? '?'}×${cam.info.caps.height?.max ?? '?'}, ${cam.info.caps.frameRate?.max ?? '?'} fps`
    : null
  const fpsMismatch = cam.status === 'live' && cam.info?.frameRate != null && Math.round(cam.info.frameRate) !== cam.fps

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog">
        <div className="row">
          <strong style={{ flex: 1, fontSize: 15 }}>Settings</strong>
          <button onClick={onClose} style={{ flex: '0 0 auto' }}>Done</button>
        </div>

        <h3>Camera{relay.mode === 'receive' ? ' (showing the Mac relay)' : ''}</h3>
        <label className="toggle"><input type="checkbox" checked={cameraOn} onChange={(e) => setCameraOn(e.target.checked)} /> Show a camera feed behind the words</label>
        {cameraOn && (<>
        <div className="row">
          <label>Source</label>
          <select value={cam.deviceId ?? ''} onChange={(e) => cam.setDeviceId(e.target.value)}>
            {cam.devices.length === 0 && <option value="">No cameras</option>}
            {cam.devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 6)}`}</option>
            ))}
          </select>
        </div>
        <div className="row">
          <label>Frame rate</label>
          <select value={cam.fps} onChange={(e) => cam.setFps(Number(e.target.value))}>
            {[24, 25, 30, 50, 60].map((f) => <option key={f} value={f}>{f} fps</option>)}
          </select>
        </div>
        {(capsText || fpsMismatch || cam.error) && (
          <div style={{ color: fpsMismatch || cam.error ? 'var(--warn)' : 'var(--muted)', fontSize: 12 }}>
            {cam.error ?? (fpsMismatch ? `camera negotiated ${cam.info!.frameRate!.toFixed(0)} fps, not ${cam.fps}` : capsText)}
          </div>
        )}
        </>)}

        <RelayPanel relay={relay} canShare={cam.status === 'live' && !!cam.stream} onShare={() => cam.stream && relay.share(cam.stream)} />

        <h3>Voice</h3>
        <div className="row">
          <label>Mic</label>
          <select value={speech.micId ?? ''} onChange={(e) => speech.setMicId(e.target.value)} disabled={speech.status === 'listening'}>
            {speech.mics.length === 0 && <option value="">No mics</option>}
            {speech.mics.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 6)}`}</option>
            ))}
          </select>
        </div>
        <div className="row">
          <label>Wake word</label>
          <input type="text" value={aligner.wakeText} onChange={(e) => aligner.setWakeText(e.target.value)} placeholder="bon" />
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12 }}>
          Say "<b>{aligner.wakeText.split(/[,\s]+/)[0] || 'bon'} back</b>" / "… forward three" (lines), "… next" / "… previous" / "… back two paragraphs", "… start" / "… end", "… play" / "… pause", "… hold" / "… go". Comma-separate aliases if it mishears.
        </div>
        <label className="toggle"><input type="checkbox" checked={aligner.enabled} onChange={(e) => aligner.setEnabled(e.target.checked)} /> Follow my voice</label>
        {speech.status === 'unsupported' && <div style={{ color: 'var(--warn)', fontSize: 12 }}>Speech recognition needs Chrome.</div>}
        {speech.error && <div style={{ color: 'var(--warn)', fontSize: 12 }}>{speech.error}</div>}

        <h3>Text</h3>
        <div className="row">
          <label>Size</label>
          <input type="range" min={3} max={30} step={0.25} value={prefs.fontSize} onChange={(e) => setPrefs((p) => ({ ...p, fontSize: Number(e.target.value) }))} />
          <span className="val">{Math.round(fontPx(prefs))}px</span>
        </div>
        <div className="row">
          <label>Line at</label>
          <input type="range" min={0.15} max={0.6} step={0.01} value={prefs.lineAt} onChange={(e) => setPrefs((p) => ({ ...p, lineAt: Number(e.target.value) }))} />
          <span className="val">{Math.round(prefs.lineAt * 100)}%</span>
        </div>
        <div className="row">
          <label>Width</label>
          <input type="range" min={0.4} max={1} step={0.02} value={prefs.width} onChange={(e) => setPrefs((p) => ({ ...p, width: Number(e.target.value) }))} />
          <span className="val">{Math.round(prefs.width * 100)}%</span>
        </div>
        <label className="toggle"><input type="checkbox" checked={prefs.mirror} onChange={(e) => setPrefs((p) => ({ ...p, mirror: e.target.checked }))} /> Mirror (beam-splitter glass)</label>

        <h3>Display</h3>
        <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.().catch(() => {}))}>
          Toggle fullscreen (F)
        </button>

        <h3>Play speed</h3>
        <div className="row">
          <label>Speed</label>
          <input type="range" min={40} max={400} step={5} value={ctl.wpm} onChange={(e) => ctl.setWpm(Number(e.target.value))} />
          <span className="val">{ctl.wpm} wpm</span>
        </div>
      </div>
    </>
  )
}

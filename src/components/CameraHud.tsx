import type { UseCameraResult } from '../hooks/useCamera'
import type { PrompterControl } from '../hooks/usePrompterControl'
import type { PrompterPrefs } from './Prompter'

interface Props {
  cam: UseCameraResult
  prefs: PrompterPrefs
  setPrefs: (f: (p: PrompterPrefs) => PrompterPrefs) => void
  ctl: PrompterControl
  wordCount: number
  onEdit: () => void
  onFullscreen: () => void
  hidden: boolean
}

const panel: React.CSSProperties = {
  position: 'fixed',
  left: 12,
  right: 12,
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  padding: '8px 12px',
  background: 'var(--panel)',
  borderRadius: 10,
  backdropFilter: 'blur(8px)',
  fontSize: 13,
  transition: 'opacity 200ms',
  zIndex: 10,
}

export function CameraHud({ cam, prefs, setPrefs, ctl, wordCount, onEdit, onFullscreen, hidden }: Props) {
  const { devices, deviceId, setDeviceId, info, status, error, fps, setFps } = cam
  const is4k = (info?.width ?? 0) >= 3840
  const resColor = status !== 'live' ? 'var(--muted)' : is4k ? 'var(--ok)' : 'var(--warn)'
  const fpsMismatch = status === 'live' && info?.frameRate != null && Math.round(info.frameRate) !== fps
  const capsText = info?.caps
    ? `advertised: ${info.caps.width?.max ?? '?'}×${info.caps.height?.max ?? '?'} max, ${info.caps.frameRate?.min ?? '?'}–${info.caps.frameRate?.max ?? '?'} fps`
    : null
  const hiddenStyle = { opacity: hidden ? 0 : 1, pointerEvents: hidden ? 'none' : 'auto' } as const

  return (
    <>
      <div style={{ ...panel, ...hiddenStyle, top: 12 }}>
        <strong>Osmo Prompter</strong>
        <select value={deviceId ?? ''} onChange={(e) => setDeviceId(e.target.value)}>
          {devices.length === 0 && <option value="">No cameras</option>}
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
            </option>
          ))}
        </select>
        <select value={fps} onChange={(e) => setFps(Number(e.target.value))} title="Requested frame rate">
          {[24, 25, 30, 50, 60].map((f) => (
            <option key={f} value={f}>
              {f} fps
            </option>
          ))}
        </select>
        <span style={{ color: resColor, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
          {status === 'live' && info
            ? `${info.width}×${info.height} @ ${info.frameRate?.toFixed(0) ?? '?'}fps${is4k ? '  4K' : ''}`
            : status === 'requesting'
              ? 'Connecting…'
              : status === 'error'
                ? 'Error'
                : 'Idle'}
        </span>
        {fpsMismatch && <span style={{ color: 'var(--warn)' }}>camera gave {info!.frameRate!.toFixed(2)} not {fps}</span>}
        {capsText && <span style={{ color: 'var(--muted)' }}>{capsText}</span>}
        {error && <span style={{ color: 'var(--warn)' }}>{error}</span>}
        <span style={{ flex: 1 }} />
        <button onClick={onFullscreen}>Fullscreen</button>
      </div>

      <div style={{ ...panel, ...hiddenStyle, bottom: 12 }}>
        <button onClick={ctl.togglePlay} style={{ minWidth: 72, fontWeight: 600 }}>
          {ctl.playing ? 'Pause' : 'Play'}
        </button>
        <button onClick={() => ctl.nudge(-8)}>▲</button>
        <button onClick={() => ctl.nudge(8)}>▼</button>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--muted)' }}>
          word {ctl.cursor + 1} / {wordCount}
        </span>
        <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.2)' }} />
        <label>
          speed{' '}
          <input
            type="range"
            min={40}
            max={400}
            step={5}
            value={ctl.wpm}
            onChange={(e) => ctl.setWpm(Number(e.target.value))}
            style={{ verticalAlign: 'middle', width: 120 }}
          />{' '}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{ctl.wpm} wpm</span>
        </label>
        <label>
          size{' '}
          <input
            type="range"
            min={24}
            max={120}
            step={2}
            value={prefs.fontSize}
            onChange={(e) => setPrefs((p) => ({ ...p, fontSize: Number(e.target.value) }))}
            style={{ verticalAlign: 'middle', width: 100 }}
          />
        </label>
        <label>
          line{' '}
          <input
            type="range"
            min={0.15}
            max={0.6}
            step={0.01}
            value={prefs.lineAt}
            onChange={(e) => setPrefs((p) => ({ ...p, lineAt: Number(e.target.value) }))}
            style={{ verticalAlign: 'middle', width: 80 }}
          />
        </label>
        <label>
          width{' '}
          <input
            type="range"
            min={0.4}
            max={1}
            step={0.02}
            value={prefs.width}
            onChange={(e) => setPrefs((p) => ({ ...p, width: Number(e.target.value) }))}
            style={{ verticalAlign: 'middle', width: 80 }}
          />
        </label>
        <button onClick={() => setPrefs((p) => ({ ...p, mirror: !p.mirror }))}>
          {prefs.mirror ? 'Mirror: on' : 'Mirror: off'}
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={onEdit}>Edit script (E)</button>
        <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          Space play · ↑↓/scroll nudge · +/- speed · [ ] size · V listen · T transcript · H hide
        </span>
      </div>
    </>
  )
}

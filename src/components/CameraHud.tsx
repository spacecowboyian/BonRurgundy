import type { UseCameraResult } from '../hooks/useCamera'

interface Props {
  cam: UseCameraResult
  mirror: boolean
  onToggleMirror: () => void
  hidden: boolean
}

export function CameraHud({ cam, mirror, onToggleMirror, hidden }: Props) {
  const { devices, deviceId, setDeviceId, info, status, error, fps, setFps } = cam
  const fpsMismatch = status === 'live' && info?.frameRate != null && Math.round(info.frameRate) !== fps
  const capsText = info?.caps
    ? `advertised: ${info.caps.width?.max ?? '?'}×${info.caps.height?.max ?? '?'} max, ${info.caps.frameRate?.min ?? '?'}–${info.caps.frameRate?.max ?? '?'} fps`
    : null
  const is4k = (info?.width ?? 0) >= 3840
  const resColor = status !== 'live' ? 'var(--muted)' : is4k ? 'var(--ok)' : 'var(--warn)'

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
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
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'opacity 200ms',
      }}
    >
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
      <button onClick={onToggleMirror}>{mirror ? 'Mirror: on' : 'Mirror: off'}</button>
      <button onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}>
        Fullscreen
      </button>
      <span style={{ color: 'var(--muted)' }}>H hides HUD · M mirror · F fullscreen</span>
    </div>
  )
}

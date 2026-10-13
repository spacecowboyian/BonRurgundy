import type { UseCameraResult } from '../hooks/useCamera'
import type { PrompterControl } from '../hooks/usePrompterControl'
import type { UseSpeechResult } from '../hooks/useSpeech'
import type { AlignerView } from '../hooks/useAligner'

interface Props {
  cam: UseCameraResult
  speech: UseSpeechResult
  aligner: AlignerView
  ctl: PrompterControl
  wordCount: number
  hidden: boolean
  onEdit: () => void
  onSettings: () => void
  onFullscreen: () => void
}

export function Hud({ cam, speech, aligner, ctl, wordCount, hidden, onEdit, onSettings, onFullscreen }: Props) {
  const { info, status } = cam
  const is4k = (info?.width ?? 0) >= 3840
  const resColor = status !== 'live' ? 'var(--muted)' : is4k ? 'var(--ok)' : 'var(--warn)'
  const listening = speech.status === 'listening'
  const voiceState = !listening ? 'paused' : aligner.held ? 'held' : aligner.state.status
  const voiceColor =
    voiceState === 'tracking' ? 'var(--ok)' : voiceState === 'riffing' ? 'var(--warn)' : voiceState === 'held' ? 'var(--accent)' : 'var(--muted)'
  const cls = `bar${hidden ? ' hidden' : ''}`

  return (
    <>
      <div className={`${cls} top`}>
        <strong className="brand">Osmo Prompter</strong>
        <span className="chip" style={{ color: resColor }}>
          {status === 'live' && info
            ? `${info.width}×${info.height}${info.frameRate ? ` ${info.frameRate.toFixed(0)}p` : ''}`
            : status === 'requesting'
              ? 'camera…'
              : status === 'error'
                ? 'no camera'
                : 'idle'}
        </span>
        <span className="chip" style={{ color: voiceColor, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span className="dot" style={{ background: voiceColor, boxShadow: listening ? `0 0 8px ${voiceColor}` : undefined }} />
          {voiceState}
        </span>
        <span className="spacer" />
        <button onClick={onEdit}>Script</button>
        <button className="icon" onClick={onSettings} title="Settings">⚙</button>
        <button className="icon desktop-only" onClick={onFullscreen} title="Fullscreen">⛶</button>
      </div>

      <div className={`${cls} bottom`}>
        <button className="icon" onClick={() => ctl.nudgeLines(-1)} title="Back a line">▲</button>
        <button className="icon" onClick={() => ctl.nudgeLines(1)} title="Forward a line">▼</button>
        <button onClick={ctl.togglePlay} title="Auto-scroll at fixed speed">{ctl.playing ? 'Pause' : 'Scroll'}</button>
        <span className="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {ctl.cursor + 1}/{wordCount}
        </span>
        <span className="spacer" />
        <span className="muted desktop-only">
          Tap text to hide and resume · Space scroll · ↑↓ line · V listen · E script · F fullscreen · say "{aligner.wakeText.split(/[,\s]+/)[0] || 'bob'} back two"
        </span>
      </div>
    </>
  )
}

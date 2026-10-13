import type { RecorderView } from '../hooks/useRecorder'

interface Props {
  rec: RecorderView
  /** There is a camera feed to record. */
  available: boolean
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Red record button right of the mic. Pulses with a timer while recording. */
export function RecordButton({ rec, available }: Props) {
  if (!rec.supported) return null
  const recording = rec.status === 'recording' || rec.status === 'stopping'
  const busy = rec.status === 'starting' || rec.status === 'stopping'
  return (
    <div className="recwrap">
      <button
        className={`rec${recording ? ' on' : ''}`}
        disabled={!available || busy}
        onClick={() => (recording ? rec.stop() : rec.start())}
        title={!available ? 'Turn the camera on in Settings to record' : recording ? 'Stop recording' : 'Record the camera feed'}
        aria-label={recording ? 'Stop recording' : 'Record'}
        aria-pressed={recording}
      >
        <span className="rec-dot" />
      </button>
      {recording && (
        <span className="rec-time">
          {fmt(rec.seconds)}
          {rec.maxSeconds ? ` / ${fmt(rec.maxSeconds)}` : ''}
        </span>
      )}
      {rec.status === 'error' && rec.error && <span className="rec-err">{rec.error}</span>}
    </div>
  )
}

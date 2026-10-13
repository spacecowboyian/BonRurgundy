import { SAMPLE_SCRIPT } from '../data/sampleScript'

interface Props {
  text: string
  onChange: (t: string) => void
  onClose: () => void
}

export function ScriptEditor({ text, onChange, onClose }: Props) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const minutes = words / 150
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        padding: 24,
        gap: 12,
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <strong style={{ fontSize: 16 }}>Script</strong>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>
          {words} words · ~{minutes.toFixed(1)} min at 150 wpm
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={() => onChange(SAMPLE_SCRIPT)}>Load sample</button>
        <button onClick={() => onChange('')}>Clear</button>
        <button onClick={onClose} style={{ background: 'var(--accent)', color: '#000', fontWeight: 600 }}>
          Done (Esc)
        </button>
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your script here. Blank lines separate paragraphs."
        spellCheck={false}
        style={{
          flex: 1,
          font: '18px/1.5 ui-monospace, Menlo, monospace',
          color: 'var(--fg)',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: 16,
          resize: 'none',
          outline: 'none',
        }}
      />
    </div>
  )
}

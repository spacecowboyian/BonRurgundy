import { useRef, useState } from 'react'
import { SAMPLE_SCRIPT } from '../data/sampleScript'
import { tidyScript } from '../lib/tidy'

interface Props {
  text: string
  onChange: (t: string) => void
  onClose: () => void
  /** Status or error line, e.g. while loading from a ?script= link. */
  note?: string | null
}

export function ScriptEditor({ text, onChange, onClose, note }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const minutes = words / 150

  const loadFile = async (f: File | undefined) => {
    if (!f) return
    const raw = await f.text()
    onChange(tidyScript(raw))
  }
  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText()
      if (t) onChange(tidyScript(t))
    } catch {
      /* clipboard denied; user can paste into the textarea */
    }
  }

  return (
    <div
      className={`editor${dragging ? ' dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        loadFile(e.dataTransfer.files[0])
      }}
    >
      <div className="toolbar">
        <strong style={{ fontSize: 16 }}>Script</strong>
        <span style={{ color: 'var(--muted)' }}>
          {words} words · ~{minutes.toFixed(1)} min
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={() => fileRef.current?.click()}>Open file…</button>
        <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.fountain,text/plain,text/markdown" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
        <button onClick={paste}>Paste</button>
        <button onClick={() => onChange(tidyScript(text))} title="Strip markdown, speaker labels, stage directions">Tidy</button>
        <button onClick={() => onChange(SAMPLE_SCRIPT)}>Sample</button>
        <button onClick={() => onChange('')}>Clear</button>
        <button className="primary" onClick={onClose} disabled={!text.trim()}>
          Done
        </button>
      </div>
      {note && <div style={{ color: note.startsWith("Couldn't") ? 'var(--warn)' : 'var(--muted)', fontSize: 13 }}>{note}</div>}
      <textarea
        autoFocus
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your script here, open a .txt/.md file, or drop one on this window. Blank lines separate paragraphs."
        spellCheck={false}
      />
    </div>
  )
}

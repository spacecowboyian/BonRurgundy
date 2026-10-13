import { useEffect, useRef } from 'react'
import type { UseSpeechResult } from '../hooks/useSpeech'
import type { AlignerView } from '../hooks/useAligner'

interface Props {
  speech: UseSpeechResult
  aligner: AlignerView
  hidden: boolean
}

export function SpeechPanel({ speech, aligner, hidden }: Props) {
  const { status, error, finals, interim, log, lastGapMs, start, stop, clear } = speech
  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [log])

  const listening = status === 'listening'
  const dot = status === 'listening' ? 'var(--ok)' : status === 'error' ? 'var(--warn)' : 'var(--muted)'
  const wordCount = finals.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0)

  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        top: 'calc(60px + var(--sat))',
        width: 360,
        maxHeight: 'calc(100vh - 140px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 10,
        background: 'var(--panel)',
        borderRadius: 10,
        backdropFilter: 'blur(8px)',
        fontSize: 13,
        zIndex: 10,
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        transition: 'opacity 200ms',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ width: 10, height: 10, borderRadius: 5, background: dot, boxShadow: listening ? `0 0 8px ${dot}` : undefined }} />
        <strong>Transcript (debug, T)</strong>
        <span style={{ color: 'var(--muted)' }}>{status}</span>
        <span style={{ flex: 1 }} />
        <button onClick={listening ? stop : start} style={{ fontWeight: 600 }} disabled={status === 'unsupported'}>
          {listening ? 'Stop (V)' : 'Listen (V)'}
        </button>
        <button onClick={clear}>Clear</button>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 999,
            fontWeight: 600,
            background: aligner.state.status === 'riffing' ? 'rgba(248,113,113,0.25)' : 'rgba(74,222,128,0.2)',
            color: aligner.state.status === 'riffing' ? 'var(--warn)' : 'var(--ok)',
          }}
        >
          {aligner.state.status}
        </span>
        {aligner.held && (
          <span style={{ padding: '2px 8px', borderRadius: 999, fontWeight: 600, background: 'rgba(255,204,51,0.2)', color: 'var(--accent)' }}>
            held
          </span>
        )}
        <span style={{ color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
          tok {aligner.state.cursor} · miss {aligner.state.unmatched}
        </span>
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 12 }}>
        say <b>{aligner.wakeText.split(/[,\s]+/)[0] || 'bob'} back</b> / <b>… forward three</b> / <b>… hold</b> / <b>… go</b>
        {aligner.lastCommand && (
          <span style={{ color: 'var(--accent)', marginLeft: 8 }}>
            ← {aligner.lastCommand.cmd.kind}
            {'lines' in aligner.lastCommand.cmd ? ` ${aligner.lastCommand.cmd.lines}` : ''}
          </span>
        )}
      </div>
      {status === 'unsupported' && <span style={{ color: 'var(--warn)' }}>Web Speech API not available. Use Chrome.</span>}
      {error && <span style={{ color: 'var(--warn)' }}>{error}</span>}
      <div style={{ display: 'flex', gap: 12, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
        <span>{wordCount} final words</span>
        <span>{finals.length} segments</span>
        {lastGapMs != null && <span>gap {lastGapMs.toFixed(0)} ms</span>}
      </div>
      <div
        style={{
          minHeight: 44,
          padding: 8,
          borderRadius: 6,
          background: 'rgba(255,204,51,0.08)',
          border: '1px solid rgba(255,204,51,0.25)',
          fontStyle: 'italic',
          color: interim ? 'var(--accent)' : 'var(--muted)',
        }}
      >
        {interim || 'interim…'}
      </div>
      <div
        ref={logRef}
        style={{
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: 12,
        }}
      >
        {log.map((c, i) => (
          <div key={i} style={{ color: c.isFinal ? '#fff' : 'var(--muted)', opacity: c.isFinal ? 1 : 0.6 }}>
            <span style={{ color: c.isFinal ? 'var(--ok)' : 'var(--muted)' }}>{c.isFinal ? 'F' : 'i'}</span>{' '}
            {c.confidence != null && c.isFinal && <span style={{ color: 'var(--muted)' }}>{(c.confidence * 100).toFixed(0)}% </span>}
            {c.text}
          </div>
        ))}
      </div>
    </div>
  )
}

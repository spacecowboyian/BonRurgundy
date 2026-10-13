interface Props {
  listening: boolean
  disabled?: boolean
  onClick: () => void
  /** First visit: pulse with a glow until the user taps it. */
  guide?: boolean
}

/** Always-visible mic indicator, lower left. Red = listening, white slashed = not. */
export function MicButton({ listening, disabled, onClick, guide }: Props) {
  const color = listening ? '#ff3b30' : '#fff'
  return (
    <button
      className={`mic${guide ? ' guide' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={listening ? 'Listening. Tap to stop.' : 'Not listening. Tap to start.'}
      aria-label={listening ? 'Stop listening' : 'Start listening'}
      aria-pressed={listening}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="3" width="6" height="11" rx="3" fill={listening ? color : 'none'} />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
        {!listening && <path d="M4 4l16 16" stroke="#fff" strokeWidth="2.5" />}
      </svg>
      {listening && <span className="mic-pulse" />}
    </button>
  )
}

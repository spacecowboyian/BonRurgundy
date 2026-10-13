interface Props {
  playing: boolean
  onClick: () => void
}

/** Always-visible play/pause for fixed-speed scrolling, bottom left. */
export function PlayButton({ playing, onClick }: Props) {
  return (
    <button className="play" onClick={onClick} title={playing ? 'Pause' : 'Play at a fixed speed'} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="none">
        {playing ? (
          <>
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </>
        ) : (
          <path d="M8 5v14l11-7z" />
        )}
      </svg>
    </button>
  )
}

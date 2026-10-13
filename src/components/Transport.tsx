import type { PrompterControl } from '../hooks/usePrompterControl'

interface Props {
  ctl: PrompterControl
  playing: boolean
  onTogglePlay: () => void
}

const Icon = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" stroke="none">
    <path d={d} />
  </svg>
)

/** Tape-deck transport, bottom left: play/pause, start, prev paragraph, next paragraph, end. */
export function Transport({ ctl, playing, onTogglePlay }: Props) {
  return (
    <div className="transport">
      <button onClick={onTogglePlay} title={playing ? 'Pause' : 'Play at a fixed speed'} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing}>
        {playing ? <Icon d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <Icon d="M8 5v14l11-7z" />}
      </button>
      <button onClick={ctl.toStart} title="Go to start" aria-label="Go to start">
        <Icon d="M5 4h2v16H5zM19 5v14L8 12z" />
      </button>
      <button onClick={() => ctl.nudgeParagraphs(-1)} title="Previous paragraph" aria-label="Previous paragraph">
        <Icon d="M12 5v14L2 12zM22 5v14l-10-7z" />
      </button>
      <button onClick={() => ctl.nudgeParagraphs(1)} title="Next paragraph" aria-label="Next paragraph">
        <Icon d="M2 5v14l10-7zM12 5v14l10-7z" />
      </button>
      <button onClick={ctl.toEnd} title="Go to end" aria-label="Go to end">
        <Icon d="M17 4h2v16h-2zM5 5v14l11-7z" />
      </button>
    </div>
  )
}

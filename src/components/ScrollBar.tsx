import { useEffect, useRef, useState } from 'react'

interface Props {
  cursor: number
  wordCount: number
  /** Fraction of the script visible on screen, for the thumb size. */
  visibleFraction: number
  onSeek: (word: number) => void
}

/** Thin progress bar on the right edge. Shows position; drag it to navigate. */
export function ScrollBar({ cursor, wordCount, visibleFraction, onSeek }: Props) {
  const track = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const progress = wordCount > 1 ? cursor / (wordCount - 1) : 0
  const thumbFrac = Math.max(0.04, Math.min(1, visibleFraction))

  const seekAt = (clientY: number) => {
    const el = track.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const usable = r.height * (1 - thumbFrac)
    const f = Math.max(0, Math.min(1, (clientY - r.top - (r.height * thumbFrac) / 2) / Math.max(1, usable)))
    onSeek(Math.round(f * (wordCount - 1)))
  }

  useEffect(() => {
    if (!dragging) return
    const move = (e: PointerEvent) => seekAt(e.clientY)
    const up = () => setDragging(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, wordCount, thumbFrac])

  if (wordCount < 2) return null
  return (
    <div
      ref={track}
      className={`scrollbar${dragging ? ' dragging' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault()
        setDragging(true)
        seekAt(e.clientY)
      }}
      role="slider"
      aria-label="Position in script"
      aria-valuemin={0}
      aria-valuemax={wordCount - 1}
      aria-valuenow={cursor}
    >
      <div className="thumb" style={{ top: `${progress * (1 - thumbFrac) * 100}%`, height: `${thumbFrac * 100}%` }} />
    </div>
  )
}

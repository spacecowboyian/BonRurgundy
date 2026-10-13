import { useCallback, useEffect, useRef, useState } from 'react'

export interface PrompterControl {
  cursor: number
  setCursor: (c: number | ((c: number) => number)) => void
  playing: boolean
  togglePlay: () => void
  /** Words per minute in speed-scroll mode. */
  wpm: number
  setWpm: (w: number | ((w: number) => number)) => void
  nudge: (words: number) => void
  /** Move by rendered lines (negative = back). Needs setLines to have been called. */
  nudgeLines: (lines: number) => void
  setLines: (lineStarts: number[]) => void
  reset: () => void
}

/**
 * Manual "speed scroll" driver: advances the cursor at `wpm` while playing.
 * Later the aligner will drive `setCursor` directly and this becomes the fallback.
 */
export function usePrompterControl(wordCount: number, initialWpm = 150): PrompterControl {
  const [cursor, setCursorState] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [wpm, setWpmState] = useState(initialWpm)
  const acc = useRef(0) // fractional words accumulated
  const linesRef = useRef<number[]>([])
  const wpmRef = useRef(wpm)
  wpmRef.current = wpm

  const clamp = useCallback(
    (c: number) => Math.max(0, Math.min(c, Math.max(0, wordCount - 1))),
    [wordCount],
  )

  const setCursor = useCallback(
    (c: number | ((c: number) => number)) =>
      setCursorState((prev) => clamp(typeof c === 'function' ? c(prev) : c)),
    [clamp],
  )

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      acc.current += (wpmRef.current / 60) * dt
      if (acc.current >= 1) {
        const n = Math.floor(acc.current)
        acc.current -= n
        setCursorState((prev) => {
          const next = clamp(prev + n)
          if (next >= wordCount - 1) setPlaying(false)
          return next
        })
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, clamp, wordCount])

  return {
    cursor,
    setCursor,
    playing,
    togglePlay: useCallback(() => setPlaying((p) => !p), []),
    wpm,
    setWpm: useCallback(
      (w: number | ((w: number) => number)) =>
        setWpmState((prev) => Math.max(40, Math.min(400, typeof w === 'function' ? w(prev) : w))),
      [],
    ),
    nudge: useCallback((n: number) => setCursor((c) => c + n), [setCursor]),
    setLines: useCallback((l: number[]) => {
      linesRef.current = l
    }, []),
    nudgeLines: useCallback(
      (n: number) =>
        setCursor((c) => {
          const lines = linesRef.current
          if (lines.length === 0) return c + n * 8
          // index of the line containing c
          let li = 0
          while (li + 1 < lines.length && lines[li + 1] <= c) li++
          const target = Math.max(0, Math.min(lines.length - 1, li + n))
          return lines[target]
        }),
      [setCursor],
    ),
    reset: useCallback(() => {
      setPlaying(false)
      setCursorState(0)
      acc.current = 0
    }, []),
  }
}

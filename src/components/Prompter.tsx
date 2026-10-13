import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { ParsedScript } from '../lib/script'

export interface PrompterPrefs {
  /** Font size in vmin (percent of the shorter viewport side), so rotation keeps the size. */
  fontSize: number
  /** Reading line as a fraction of viewport height from the top. */
  lineAt: number
  /** Horizontal text width as a fraction of viewport width. */
  width: number
  mirror: boolean
}

const vmin = () => Math.min(window.innerWidth, window.innerHeight)
/** Phones get a bigger default; everything is per-device in localStorage anyway. */
export const DEFAULT_PREFS: PrompterPrefs = vmin() < 500
  ? { fontSize: 18, lineAt: 0.3, width: 0.96, mirror: false } // phone, read from 5-10 ft
  : { fontSize: 7, lineAt: 0.33, width: 0.85, mirror: false }

export const fontPx = (p: PrompterPrefs) => (p.fontSize / 100) * vmin()

interface Props {
  script: ParsedScript
  /** Index of the word currently at the reading line. */
  cursor: number
  prefs: PrompterPrefs
  /** Called with the number of words visible per viewport, for speed-mode scrolling. */
  onLayout?: (wordsPerViewport: number) => void
  /** Alignment status while listening; tints the reading line. */
  status?: 'tracking' | 'riffing' | 'held' | null
  /** Word indices that begin each rendered line, recomputed on layout changes. */
  onLines?: (lineStarts: number[]) => void
}

/**
 * Text layer. Positions the cursor word on the reading line by translating the
 * whole script block. Smooth via CSS transition; the aligner just moves `cursor`.
 */
export function Prompter({ script, cursor, prefs, onLayout, status, onLines }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  const clampedCursor = Math.max(0, Math.min(cursor, script.words.length - 1))

  // Velocity-based motion. The text rolls at your averaged speaking pace like
  // a prompter on "play"; the recognizer only nudges the speed so the reading
  // line stays locked. Stop talking and it glides to a halt.
  const anim = useRef({
    y: 0, // current translateY (px)
    v: 0, // current velocity (px/s, negative = text moving up)
    cursor: 0,
    changedAt: 0,
    rate: 0, // words/sec, slow EMA = your pace
    raf: 0,
  })
  const predict = status === 'tracking'

  useEffect(() => {
    const a = anim.current
    const now = performance.now()
    const delta = clampedCursor - a.cursor
    const dt = (now - a.changedAt) / 1000
    if (a.changedAt && delta > 0 && delta <= 8 && dt > 0.05 && dt < 4) {
      const inst = delta / dt
      a.rate = a.rate ? a.rate * 0.9 + inst * 0.1 : inst
    } else if (delta < -8 || delta > 8) {
      a.rate = 0 // jump or manual move: re-measure pace
    }
    // Small backward moves are interim-hypothesis corrections; keep the pace
    // and don't count them as "a new word arrived".
    if (delta > 0 || Math.abs(delta) > 8) a.changedAt = now
    a.cursor = clampedCursor
  }, [clampedCursor])

  const yOfWord = (i: number) => {
    const el = wordRefs.current[Math.max(0, Math.min(i, script.words.length - 1))]
    return el ? el.offsetTop + el.offsetHeight / 2 : 0
  }

  useEffect(() => {
    const a = anim.current
    const box = scrollRef.current
    if (!box) return
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const lineH = fontPx(prefs) * 1.2
      const desired = window.innerHeight * prefs.lineAt - yOfWord(a.cursor)
      const error = desired - a.y // negative: we are behind, need to move up

      let vCmd: number
      const sinceWord = (now - a.changedAt) / 1000
      if (predict && a.rate > 0 && sinceWord < 1.6) {
        // Pace in px/s from the local layout (handles wraps and paragraph gaps).
        const n = 8
        const pxPerWord = (yOfWord(a.cursor + n) - yOfWord(a.cursor)) / n || lineH / 5
        const pace = -a.rate * pxPerWord
        if (error > 0) {
          // We're ahead of the confirmed word: never reverse, just ease off.
          // Fully stopped once a line and a half ahead.
          vCmd = pace * Math.max(0, 1 - error / (1.5 * lineH))
        } else {
          // Behind: pace plus a soft catch-up, with a dead band so interim
          // jitter doesn't show.
          const lag = Math.max(0, -error - 0.4 * lineH)
          vCmd = pace - lag * 0.8
        }
      } else {
        // Not tracking (paused, riffing, held, manual): settle onto the cursor.
        vCmd = error * (Math.abs(error) > 2 * lineH ? 6 : 2.5)
      }
      // Ease velocity so starts, stops and pace changes are gradual.
      const tau = Math.abs(error) > 2 * lineH ? 0.12 : predict ? 0.8 : 0.45
      a.v += (vCmd - a.v) * (1 - Math.exp(-dt / tau))
      a.y += a.v * dt
      if (Math.abs(error) < 0.05 && Math.abs(a.v) < 0.5) {
        a.y = desired
        a.v = 0
      }
      box.style.transform = `translate3d(0, ${a.y}px, 0)`
      a.raf = requestAnimationFrame(tick)
    }
    a.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(a.raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predict, prefs.lineAt, prefs.fontSize, prefs.width, script])

  // Real line boundaries from the DOM, for "back N lines" style navigation.
  useLayoutEffect(() => {
    if (!onLines) return
    const compute = () => {
      const starts: number[] = []
      let lastTop = -1
      wordRefs.current.forEach((el, i) => {
        if (!el) return
        const top = el.offsetTop
        if (top !== lastTop) {
          starts.push(i)
          lastTop = top
        }
      })
      onLines(starts)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [script, prefs.fontSize, prefs.width, onLines])

  useEffect(() => {
    if (!onLayout) return
    const lineHeight = fontPx(prefs) * 1.2
    const linesVisible = window.innerHeight / lineHeight
    // Rough words-per-line from average word width.
    const avgWordPx = fontPx(prefs) * 0.55 * 6
    const wordsPerLine = Math.max(1, (window.innerWidth * prefs.width) / avgWordPx)
    onLayout(linesVisible * wordsPerLine)
  }, [prefs.fontSize, prefs.width, onLayout])

  const paragraphs = useMemo(() => script.paragraphs, [script])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        transform: prefs.mirror ? 'scaleX(-1)' : undefined,
        // Fade top and bottom so the text reads as a band around the reading line.
        maskImage:
          'linear-gradient(to bottom, transparent 0%, black 8%, black 78%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent 0%, black 8%, black 78%, transparent 100%)',
      }}
    >
      {/* Reading line marker */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${prefs.lineAt * 100}%`,
          height: 0,
          borderTop: `2px solid ${status === 'riffing' ? 'rgba(248,113,113,0.8)' : status === 'held' ? 'rgba(255,204,51,0.9)' : status === 'tracking' ? 'rgba(74,222,128,0.7)' : 'rgba(255,204,51,0.55)'}`,
          transition: 'border-color 200ms',
          transform: 'translateY(-1px)',
        }}
      />
      <div
        ref={scrollRef}
        style={{
          position: 'relative',
          width: `${prefs.width * 100}%`,
          margin: '0 auto',
          fontSize: `${prefs.fontSize}vmin`,
          lineHeight: 1.2,
          fontWeight: 600,
          textShadow: '0 2px 12px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,1)',
          willChange: 'transform',
          paddingTop: '50vh',
          paddingBottom: '80vh',
        }}
      >
        {paragraphs.map((para, pi) => (
          <p key={pi} style={{ margin: '0 0 0.7em' }}>
            {para.map((w) => (
              <span
                key={w.index}
                ref={(el) => {
                  wordRefs.current[w.index] = el
                }}
                style={{
                  color: w.index < clampedCursor ? 'rgba(255,255,255,0.35)' : '#fff',
                  transition: 'color 400ms',
                }}
              >
                {w.text}{' '}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  )
}

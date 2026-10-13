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
  const translateRef = useRef(0)

  const clampedCursor = Math.max(0, Math.min(cursor, script.words.length - 1))

  useLayoutEffect(() => {
    const el = wordRefs.current[clampedCursor]
    const box = scrollRef.current
    if (!el || !box) return
    const targetY = window.innerHeight * prefs.lineAt
    // offsetTop is relative to the scroll container (position: relative).
    const y = el.offsetTop + el.offsetHeight / 2
    translateRef.current = targetY - y
    box.style.transform = `translateY(${translateRef.current}px)`
  }, [clampedCursor, prefs.lineAt, prefs.fontSize, prefs.width, script])

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
          transition: 'transform 220ms cubic-bezier(.2,.8,.2,1)',
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

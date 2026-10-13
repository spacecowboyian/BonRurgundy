/**
 * Voice commands, detected on normalized tokens. Grammar:
 *   <wake> (back|up|rewind|backward[s]) [N]
 *   <wake> (forward[s]|ahead|down|skip) [N]
 *   <wake> (go back|go forward) [N]
 *   <wake> hold | pause | stop | wait
 *   <wake> go | resume | continue
 * N is one..twenty (digits arrive already expanded to words by normalize).
 * The wake word is a set of aliases because the recognizer spells short words
 * inconsistently; "bob" is one syllable, rare in scripts and transcribes reliably.
 */

export const DEFAULT_WAKE = ['bob']
export const WAKE = DEFAULT_WAKE[0]

/** Parse a user-entered wake list: "cue, q, queue" -> normalized tokens. */
export function parseWakeList(s: string | null | undefined): string[] {
  return (s ?? '')
    .toLowerCase()
    .split(/[\s,]+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
}

export type Command =
  | { kind: 'back'; lines: number }
  | { kind: 'forward'; lines: number }
  | { kind: 'prevPara'; count: number }
  | { kind: 'nextPara'; count: number }
  | { kind: 'start' }
  | { kind: 'end' }
  | { kind: 'play' }
  | { kind: 'pause' }
  | { kind: 'hold' }
  | { kind: 'go' }

const BACK = new Set(['back', 'backward', 'backwards', 'up'])
const FWD = new Set(['forward', 'forwards', 'ahead', 'down', 'skip'])
const HOLD = new Set(['hold', 'wait', 'freeze'])
const GO = new Set(['go', 'resume', 'continue'])
const START = new Set(['start', 'beginning', 'top', 'restart', 'rewind'])
const END = new Set(['end', 'bottom', 'finish'])
const NEXT = new Set(['next'])
const PREV = new Set(['previous', 'last', 'prior'])
const PLAY = new Set(['play', 'scroll'])
const PAUSE = new Set(['pause', 'stop'])
const PARA = new Set(['paragraph', 'paragraphs', 'section', 'sections'])
const NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  a: 1, // "back a line"
}
const FILLER = new Set(['line', 'lines', 'please'])

export interface ParsedCommands {
  commands: Command[]
  /** Tokens after the last command (or all tokens if none). Safe to align. */
  rest: string[]
  /** Index in the input of the last command's wake word, or -1. */
  lastAt: number
}

/** Parse one command starting at tokens[i] === WAKE. Returns [command, tokensConsumed] or null. */
function parseAt(tokens: string[], i: number): [Command, number] | null {
  // tokens[i] is a wake word
  let j = i + 1
  if (tokens[j] === 'go' && (BACK.has(tokens[j + 1] ?? '') || FWD.has(tokens[j + 1] ?? ''))) j++
  const verb = tokens[j]
  if (!verb) return null
  // "go to the start" / "go to end"
  if (verb === 'go' && tokens[j + 1] === 'to') {
    let k = j + 2
    if (tokens[k] === 'the') k++
    if (START.has(tokens[k] ?? '')) return [{ kind: 'start' }, k + 1 - i]
    if (END.has(tokens[k] ?? '')) return [{ kind: 'end' }, k + 1 - i]
  }
  if (START.has(verb)) return [{ kind: 'start' }, j + 1 - i]
  if (END.has(verb)) return [{ kind: 'end' }, j + 1 - i]
  if (HOLD.has(verb)) return [{ kind: 'hold' }, j + 1 - i]
  if (GO.has(verb)) return [{ kind: 'go' }, j + 1 - i]
  if (PLAY.has(verb)) return [{ kind: 'play' }, j + 1 - i]
  if (PAUSE.has(verb)) return [{ kind: 'pause' }, j + 1 - i]

  let dir: 'back' | 'forward' | null = null
  if (BACK.has(verb) || PREV.has(verb)) dir = 'back'
  else if (FWD.has(verb) || NEXT.has(verb)) dir = 'forward'
  if (!dir) return null
  // "next"/"previous" default to paragraphs; "back"/"forward" default to lines.
  let unit: 'line' | 'para' = NEXT.has(verb) || PREV.has(verb) ? 'para' : 'line'
  j++
  let n = 1
  // optional count, unit and filler in any order: "back two paragraphs", "next paragraph"
  for (let k = 0; k < 3 && tokens[j]; k++) {
    const t = tokens[j]
    if (t in NUM) {
      n = NUM[t]
      j++
    } else if (PARA.has(t)) {
      unit = 'para'
      j++
    } else if (FILLER.has(t)) {
      j++
    } else break
  }
  if (unit === 'para') return [{ kind: dir === 'back' ? 'prevPara' : 'nextPara', count: n }, j - i]
  return [{ kind: dir, lines: n }, j - i]
}

export function parseCommands(tokens: string[], wake: readonly string[] = DEFAULT_WAKE): ParsedCommands {
  const commands: Command[] = []
  let restFrom = 0
  let lastAt = -1
  for (let i = 0; i < tokens.length; i++) {
    if (!wake.includes(tokens[i])) continue
    const hit = parseAt(tokens, i)
    if (!hit) continue
    commands.push(hit[0])
    lastAt = i
    restFrom = i + hit[1]
    i = restFrom - 1
  }
  return { commands, rest: tokens.slice(restFrom), lastAt }
}

/** True if the tail of `tokens` could still become a command (wake word seen, verb pending). */
export function pendingCommand(tokens: string[], wake: readonly string[] = DEFAULT_WAKE): boolean {
  let i = -1
  for (let k = tokens.length - 1; k >= 0; k--) if (wake.includes(tokens[k])) { i = k; break }
  return i >= 0 && parseAt(tokens, i) === null
}

/** Index of the last wake word in tokens, or -1. */
export function lastWakeIndex(tokens: string[], wake: readonly string[]): number {
  for (let k = tokens.length - 1; k >= 0; k--) if (wake.includes(tokens[k])) return k
  return -1
}

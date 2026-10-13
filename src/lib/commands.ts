/**
 * Voice commands, detected on normalized tokens. Grammar:
 *   prompter (back|up|rewind|backward[s]) [N]
 *   prompter (forward[s]|ahead|down|skip) [N]
 *   prompter (go back|go forward) [N]
 *   prompter hold | prompter pause | prompter stop
 *   prompter go | prompter resume
 * N is one..twenty (digits arrive already expanded to words by normalize).
 */

export const WAKE = 'prompter'

export type Command =
  | { kind: 'back'; lines: number }
  | { kind: 'forward'; lines: number }
  | { kind: 'hold' }
  | { kind: 'go' }

const BACK = new Set(['back', 'backward', 'backwards', 'up', 'rewind'])
const FWD = new Set(['forward', 'forwards', 'ahead', 'down', 'skip'])
const HOLD = new Set(['hold', 'pause', 'stop', 'wait'])
const GO = new Set(['go', 'resume', 'continue'])
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
  let j = i + 1
  if (tokens[j] === 'go' && (BACK.has(tokens[j + 1] ?? '') || FWD.has(tokens[j + 1] ?? ''))) j++
  const verb = tokens[j]
  if (!verb) return null
  let kind: Command['kind'] | null = null
  if (BACK.has(verb)) kind = 'back'
  else if (FWD.has(verb)) kind = 'forward'
  else if (HOLD.has(verb)) kind = 'hold'
  else if (GO.has(verb)) kind = 'go'
  if (!kind) return null
  j++
  if (kind === 'hold' || kind === 'go') return [{ kind }, j - i]
  let lines = 1
  // optional count and filler, in any order: "back two lines", "back lines two"
  for (let k = 0; k < 3 && tokens[j]; k++) {
    const t = tokens[j]
    if (t in NUM) {
      lines = NUM[t]
      j++
    } else if (FILLER.has(t)) {
      j++
    } else break
  }
  return [{ kind, lines }, j - i]
}

export function parseCommands(tokens: string[]): ParsedCommands {
  const commands: Command[] = []
  let restFrom = 0
  let lastAt = -1
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] !== WAKE) continue
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
export function pendingCommand(tokens: string[]): boolean {
  const i = tokens.lastIndexOf(WAKE)
  return i >= 0 && parseAt(tokens, i) === null
}

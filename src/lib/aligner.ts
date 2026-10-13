import { normalize, similarity } from './normalize'
import type { ParsedScript } from './script'

/** A script token: normalized form plus the display word it came from. */
export interface ScriptToken {
  norm: string
  wordIndex: number
}

export interface AlignerConfig {
  /** Tokens ahead of the cursor a single word may match: the "expected next" zone. */
  near: number
  /** Tokens ahead to search when re-syncing with a phrase. */
  farWindow: number
  /** Tokens behind to search when re-syncing with a phrase (re-reads). */
  lookbehind: number
  /** Minimum similarity for a fuzzy token match. */
  minSim: number
  /** Consecutive unmatched tokens before we decide the speaker is riffing. */
  riffAfter: number
  /** Unmatched for at least this long before a phrase re-sync is allowed. */
  resyncAfterMs: number
  /** Consecutive recognized tokens that must match in a row to re-sync. */
  phrase: number
}

export const DEFAULT_CONFIG: AlignerConfig = {
  near: 3,
  farWindow: 120,
  lookbehind: 40,
  minSim: 0.75,
  riffAfter: 6,
  resyncAfterMs: 2000,
  phrase: 3,
}

export type AlignStatus = 'tracking' | 'riffing'

export interface AlignState {
  /** Index of the next script token expected (one past the last matched). */
  cursor: number
  /** Consecutive recognized tokens that found no match. */
  unmatched: number
  status: AlignStatus
  /** Recent recognized tokens that didn't match, oldest first (for phrase re-sync). */
  recent: string[]
  /** Timestamp (ms) of the last confirmed match; null until the first. */
  lastMatchAt: number | null
}

export const INITIAL_STATE: AlignState = { cursor: 0, unmatched: 0, status: 'tracking', recent: [], lastMatchAt: null }

/** Very common words only ever confirm the immediate next token. */
const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'is', 'it', 'that', 'this', 'was', 'for', 'on', 'at', 'we', 'i', 'he', 'so', 'but', 'or', 'as', 'be', 'by', 'you', 'know', 'well', 'hey', 'um', 'uh', 'like', 'just', 'yeah', 'okay', 'ok', 'right'])

export function tokenizeScript(script: ParsedScript): ScriptToken[] {
  const out: ScriptToken[] = []
  for (const w of script.words) for (const n of normalize(w.text)) out.push({ norm: n, wordIndex: w.index })
  return out
}

function matches(a: string, b: string, minSim: number): boolean {
  if (a === b) return true
  if (a.length <= 3 || b.length <= 3) return false // short words must be exact
  return similarity(a, b) >= minSim
}

/** Does `phrase` (recognized tokens) match script tokens starting at `at`? */
function phraseAt(tokens: ScriptToken[], phrase: string[], at: number, minSim: number): boolean {
  if (at < 0 || at + phrase.length > tokens.length) return false
  for (let k = 0; k < phrase.length; k++) if (!matches(phrase[k], tokens[at + k].norm, minSim)) return false
  return true
}

/** Find `phrase` nearest to `from`, searching forward then back. Returns start index or -1. */
function findPhrase(tokens: ScriptToken[], phrase: string[], from: number, cfg: AlignerConfig): number {
  const lo = Math.max(0, from - cfg.lookbehind)
  const hi = Math.min(tokens.length, from + cfg.farWindow)
  let best = -1
  let bestDist = Infinity
  for (let i = lo; i < hi; i++) {
    if (!phraseAt(tokens, phrase, i, cfg.minSim)) continue
    // Prefer forward matches slightly: reading ahead is more likely than re-reading.
    const dist = i >= from ? i - from : (from - i) * 1.5
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

/**
 * Advance the alignment state by one recognized token. Pure.
 *
 * Flow-first policy:
 * - A token advances the cursor only if it matches one of the next `near`
 *   expected tokens (this absorbs a dropped word or a mis-heard one).
 * - Anything else is treated as an ad-lib: it never causes a jump by itself.
 * - If the reader has been unmatched for `resyncAfterMs` and the last `phrase`
 *   recognized tokens appear consecutively somewhere nearby, jump there.
 *   That's the only way to move more than `near` tokens at once.
 * - `riffAfter` consecutive misses flags riffing (cursor frozen) until a
 *   match or a re-sync.
 */
export function step(state: AlignState, tokens: ScriptToken[], tok: string, now: number, cfg: AlignerConfig = DEFAULT_CONFIG): AlignState {
  if (tokens.length === 0) return state
  const from = state.cursor

  // 1. Expected-next zone. Stop/filler words only confirm the very next token.
  const reach = STOP.has(tok) ? 1 : cfg.near
  for (let i = from; i < Math.min(tokens.length, from + reach); i++) {
    if (matches(tok, tokens[i].norm, cfg.minSim)) {
      return { cursor: i + 1, unmatched: 0, status: 'tracking', recent: [], lastMatchAt: now }
    }
  }

  // 2. Not expected: remember it, count the miss.
  const recent = [...state.recent, tok].slice(-Math.max(cfg.phrase, 6))
  const unmatched = state.unmatched + 1
  const since = state.lastMatchAt == null ? Infinity : now - state.lastMatchAt

  // 3. Phrase re-sync, only after a sustained mismatch and only on a real phrase.
  if (since >= cfg.resyncAfterMs && recent.length >= cfg.phrase) {
    const phrase = recent.slice(-cfg.phrase)
    if (!phrase.every((p) => STOP.has(p))) {
      const at = findPhrase(tokens, phrase, from, cfg)
      if (at >= 0) {
        return { cursor: at + phrase.length, unmatched: 0, status: 'tracking', recent: [], lastMatchAt: now }
      }
    }
  }

  return {
    cursor: state.cursor,
    unmatched,
    status: unmatched >= cfg.riffAfter ? 'riffing' : state.status,
    recent,
    lastMatchAt: state.lastMatchAt,
  }
}

/** Fold a list of recognized tokens through `step`, all stamped with `now`. */
export function align(state: AlignState, tokens: ScriptToken[], recognized: string[], now: number, cfg: AlignerConfig = DEFAULT_CONFIG): AlignState {
  let s = state
  for (const tok of recognized) s = step(s, tokens, tok, now, cfg)
  return s
}

/** Script word index to display for a token cursor (the word of the next expected token). */
export function cursorWord(tokens: ScriptToken[], cursor: number): number {
  if (tokens.length === 0) return 0
  const i = Math.min(cursor, tokens.length - 1)
  return tokens[i].wordIndex
}

/** Token cursor for a given word index (first token of that word), for manual resync. */
export function wordToCursor(tokens: ScriptToken[], wordIndex: number): number {
  const i = tokens.findIndex((t) => t.wordIndex >= wordIndex)
  return i < 0 ? tokens.length : i
}

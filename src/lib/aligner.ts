import { normalize, similarity } from './normalize'
import type { ParsedScript } from './script'

/** A script token: normalized form plus the display word it came from. */
export interface ScriptToken {
  norm: string
  wordIndex: number
}

export interface AlignerConfig {
  /** How far ahead of the cursor to search, in tokens. */
  window: number
  /** How far behind to search for a re-read, in tokens. */
  lookbehind: number
  /** Minimum similarity for a fuzzy token match. */
  minSim: number
  /** Consecutive unmatched tokens before we decide the speaker is riffing. */
  riffAfter: number
  /** Penalty per token of forward distance, so near matches beat far ones. */
  distancePenalty: number
}

export const DEFAULT_CONFIG: AlignerConfig = {
  window: 40,
  lookbehind: 15,
  minSim: 0.75,
  riffAfter: 6,
  distancePenalty: 0.015,
}

export type AlignStatus = 'tracking' | 'riffing'

export interface AlignState {
  /** Index of the next script token expected (one past the last matched). */
  cursor: number
  /** Consecutive recognized tokens that found no match. */
  unmatched: number
  status: AlignStatus
  /** Last recognized token, used for bigram re-read detection. */
  prevTok: string | null
}

export const INITIAL_STATE: AlignState = { cursor: 0, unmatched: 0, status: 'tracking', prevTok: null }

/** Very common words only match close to the cursor to avoid false jumps. */
const STOP = new Set(['the', 'a', 'an', 'and', 'of', 'to', 'in', 'is', 'it', 'that', 'this', 'was', 'for', 'on', 'at', 'we', 'i', 'he', 'so', 'but', 'or', 'as', 'be', 'by'])
const STOP_REACH = 4

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

/** Find the best match for `tok` in [from, to). Returns token index or -1. */
function findForward(tokens: ScriptToken[], tok: string, from: number, to: number, cfg: AlignerConfig): number {
  const reach = STOP.has(tok) ? Math.min(to, from + STOP_REACH) : to
  let best = -1
  let bestScore = -Infinity
  for (let i = from; i < reach && i < tokens.length; i++) {
    const t = tokens[i].norm
    if (!matches(tok, t, cfg.minSim)) continue
    const score = (t === tok ? 1 : similarity(tok, t)) - (i - from) * cfg.distancePenalty
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

/**
 * Advance the alignment state by one recognized token. Pure.
 * - Forward fuzzy match in the window: cursor jumps past it.
 * - Otherwise a bigram (prev + this) match behind the cursor: re-read, jump back.
 * - Otherwise unmatched++; after `riffAfter` we flag riffing (cursor frozen).
 */
export function step(state: AlignState, tokens: ScriptToken[], tok: string, cfg: AlignerConfig = DEFAULT_CONFIG): AlignState {
  if (tokens.length === 0) return state
  const from = state.cursor
  // Stop words only confirm a run already in progress; they never start one.
  const fwd = STOP.has(tok) && state.unmatched > 0 ? -1 : findForward(tokens, tok, from, from + cfg.window, cfg)
  if (fwd >= 0) {
    return { cursor: fwd + 1, unmatched: 0, status: 'tracking', prevTok: tok }
  }
  // Re-read detection: previous and current recognized tokens matching two
  // consecutive script tokens somewhere behind the cursor.
  if (state.prevTok && !STOP.has(tok)) {
    const lo = Math.max(0, from - cfg.lookbehind)
    for (let i = lo; i < from - 1; i++) {
      if (matches(state.prevTok, tokens[i].norm, cfg.minSim) && matches(tok, tokens[i + 1].norm, cfg.minSim)) {
        return { cursor: i + 2, unmatched: 0, status: 'tracking', prevTok: tok }
      }
    }
  }
  const unmatched = state.unmatched + 1
  return {
    cursor: state.cursor,
    unmatched,
    status: unmatched >= cfg.riffAfter ? 'riffing' : state.status,
    prevTok: tok,
  }
}

/** Fold a list of recognized tokens through `step`. */
export function align(state: AlignState, tokens: ScriptToken[], recognized: string[], cfg: AlignerConfig = DEFAULT_CONFIG): AlignState {
  let s = state
  for (const tok of recognized) s = step(s, tokens, tok, cfg)
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

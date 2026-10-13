import { useEffect, useMemo, useRef, useState } from 'react'
import { align, cursorWord, INITIAL_STATE, tokenizeScript, wordToCursor, type AlignState } from '../lib/aligner'
import { normalize } from '../lib/normalize'
import type { ParsedScript } from '../lib/script'
import type { UseSpeechResult } from './useSpeech'
import type { PrompterControl } from './usePrompterControl'

export interface AlignerView {
  enabled: boolean
  setEnabled: (v: boolean) => void
  state: AlignState
  /** Recognized tokens from the current interim hypothesis, for the debug panel. */
  interimTokens: string[]
}

/**
 * Drives the prompter cursor from speech.
 * - Finals are folded once into a checkpoint state.
 * - Each interim hypothesis is re-applied on top of the checkpoint (interims
 *   replace, not append), so the cursor moves smoothly as the hypothesis grows.
 * - A manual cursor change (nudge, scroll, click) resets the checkpoint there.
 */
export function useAligner(script: ParsedScript, speech: UseSpeechResult, ctl: PrompterControl): AlignerView {
  const tokens = useMemo(() => tokenizeScript(script), [script])
  const [enabled, setEnabled] = useState(true)
  const [view, setView] = useState<AlignState>(INITIAL_STATE)
  const checkpoint = useRef<AlignState>(INITIAL_STATE)
  const finalsSeen = useRef(0)
  const lastSet = useRef<number>(-1)
  const interimTokens = useMemo(() => normalize(speech.interim), [speech.interim])

  // Manual move: resync checkpoint to the new cursor.
  useEffect(() => {
    if (ctl.cursor !== lastSet.current) {
      checkpoint.current = { ...INITIAL_STATE, cursor: wordToCursor(tokens, ctl.cursor) }
      setView(checkpoint.current)
      lastSet.current = ctl.cursor
    }
  }, [ctl.cursor, tokens])

  // Script changed: start over.
  useEffect(() => {
    checkpoint.current = INITIAL_STATE
    finalsSeen.current = speech.finals.length
    setView(INITIAL_STATE)
  }, [tokens]) // eslint-disable-line react-hooks/exhaustive-deps

  // Transcript cleared: forget finals.
  useEffect(() => {
    if (speech.finals.length < finalsSeen.current) finalsSeen.current = 0
  }, [speech.finals.length])

  useEffect(() => {
    if (!enabled || tokens.length === 0) return
    // Fold any new finals into the checkpoint.
    if (speech.finals.length > finalsSeen.current) {
      const fresh = speech.finals.slice(finalsSeen.current)
      finalsSeen.current = speech.finals.length
      for (const c of fresh) checkpoint.current = align(checkpoint.current, tokens, normalize(c.text))
    }
    const live = interimTokens.length ? align(checkpoint.current, tokens, interimTokens) : checkpoint.current
    setView(live)
    const word = cursorWord(tokens, live.cursor)
    if (word !== ctl.cursor) {
      lastSet.current = word
      ctl.setCursor(word)
    }
  }, [enabled, tokens, speech.finals, interimTokens, ctl])

  return { enabled, setEnabled, state: view, interimTokens }
}

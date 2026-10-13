import { useEffect, useMemo, useRef, useState } from 'react'
import { align, cursorWord, INITIAL_STATE, tokenizeScript, wordToCursor, type AlignState } from '../lib/aligner'
import { normalize } from '../lib/normalize'
import { DEFAULT_WAKE, lastWakeIndex, parseCommands, parseWakeList, pendingCommand, type Command } from '../lib/commands'
import { useLocalState } from '../lib/storage'
import type { ParsedScript } from '../lib/script'
import type { UseSpeechResult } from './useSpeech'
import type { PrompterControl } from './usePrompterControl'

export interface AlignerView {
  enabled: boolean
  setEnabled: (v: boolean) => void
  state: AlignState
  /** Recognized tokens from the current interim hypothesis, for the debug panel. */
  interimTokens: string[]
  /** Voice "hold" is active: cursor frozen until "go" or a manual move. */
  held: boolean
  setHeld: (v: boolean) => void
  /** Last voice command executed, for the debug panel. */
  lastCommand: { cmd: Command; at: number } | null
  /** Wake word aliases as the user typed them, e.g. "cue, q, queue". */
  wakeText: string
  setWakeText: (s: string) => void
}

/**
 * Drives the prompter cursor from speech.
 * - Finals are folded once into a checkpoint state.
 * - Each interim hypothesis is re-applied on top of the checkpoint (interims
 *   replace, not append), so the cursor moves smoothly as the hypothesis grows.
 * - A manual cursor change (nudge, scroll, click) resets the checkpoint there.
 */
export function useAligner(script: ParsedScript, speech: UseSpeechResult, ctl: PrompterControl, onPlay?: (play: boolean) => void): AlignerView {
  const tokens = useMemo(() => tokenizeScript(script), [script])
  const [enabled, setEnabled] = useState(true)
  const [view, setView] = useState<AlignState>(INITIAL_STATE)
  const checkpoint = useRef<AlignState>(INITIAL_STATE)
  const finalsSeen = useRef(0)
  const lastSet = useRef<number>(-1)
  const interimTokens = useMemo(() => normalize(speech.interim), [speech.interim])
  const [held, setHeld] = useState(false)
  const [wakeTextRaw, setWakeText] = useLocalState<string>('osmo-prompter.wake', DEFAULT_WAKE.join(', '))
  const wakeText = wakeTextRaw ?? ''
  // Older builds saved 'prompter', 'bob', 'cue, q, queue' or just 'bon'; move those to the current default.
  useEffect(() => {
    const w = parseWakeList(wakeText).join(',')
    if (['', 'prompter', 'bob', 'cue,q,queue', 'bon', 'bon,bonn'].includes(w)) setWakeText(DEFAULT_WAKE.join(', '))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const wake = useMemo(() => {
    const w = parseWakeList(wakeText)
    return w.length ? w : DEFAULT_WAKE
  }, [wakeText])
  const [lastCommand, setLastCommand] = useState<{ cmd: Command; at: number } | null>(null)
  // Fingerprint of the command fired from the current interim, so the final
  // for the same utterance doesn't fire it again.
  const firedInterim = useRef<string | null>(null)
  // Interim hypotheses grow word by word ("bon back" then "bon back two"), so
  // wait for the phrase to settle before firing, else "back two" fires twice.
  const pendingTimer = useRef<number | null>(null)
  const pendingFp = useRef<string | null>(null)

  const runCommand = (cmd: Command) => {
    setLastCommand({ cmd, at: performance.now() })
    switch (cmd.kind) {
      case 'back':
        ctl.nudgeLines(-cmd.lines)
        break
      case 'forward':
        ctl.nudgeLines(cmd.lines)
        break
      case 'prevPara':
        ctl.nudgeParagraphs(-cmd.count)
        break
      case 'nextPara':
        ctl.nudgeParagraphs(cmd.count)
        break
      case 'start':
        ctl.toStart()
        break
      case 'end':
        ctl.toEnd()
        break
      case 'play':
        onPlay?.(true)
        break
      case 'pause':
        onPlay?.(false)
        break
      case 'hold':
        setHeld(true)
        break
      case 'go':
        setHeld(false)
        break
    }
  }

  // Manual move (keys, scroll, voice command): resync checkpoint to the new cursor.
  useEffect(() => {
    if (ctl.cursor !== lastSet.current) {
      checkpoint.current = { ...INITIAL_STATE, cursor: wordToCursor(tokens, ctl.cursor) }
      setView(checkpoint.current)
      lastSet.current = ctl.cursor
      // A keyboard/scroll move while held is the user taking over; release.
      setHeld(false)
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
    // Fold any new finals into the checkpoint. Commands inside a final were
    // already fired from its interim; just strip them and align the remainder.
    if (speech.finals.length > finalsSeen.current) {
      const fresh = speech.finals.slice(finalsSeen.current)
      finalsSeen.current = speech.finals.length
      for (const c of fresh) {
        const parsed = parseCommands(normalize(c.text), wake)
        if (parsed.commands.length) {
          const fp = JSON.stringify(parsed.commands)
          if (pendingTimer.current) {
            window.clearTimeout(pendingTimer.current)
            pendingTimer.current = null
          }
          if (firedInterim.current !== fp) parsed.commands.forEach(runCommand)
          firedInterim.current = null
          pendingFp.current = null
          // The command moved the cursor; the manual-move effect will reset the
          // checkpoint. Align only what was said after the command.
          checkpoint.current = { ...INITIAL_STATE, cursor: wordToCursor(tokens, ctl.cursor) }
          if (parsed.rest.length && !held) checkpoint.current = align(checkpoint.current, tokens, parsed.rest, c.at)
          continue
        }
        if (!held) checkpoint.current = align(checkpoint.current, tokens, parsed.rest, c.at)
      }
    }

    // Interim: fire a command once the phrase has settled, once per utterance.
    const parsed = parseCommands(interimTokens, wake)
    if (parsed.commands.length) {
      const fp = JSON.stringify(parsed.commands)
      if (firedInterim.current !== fp && pendingFp.current !== fp) {
        pendingFp.current = fp
        if (pendingTimer.current) window.clearTimeout(pendingTimer.current)
        pendingTimer.current = window.setTimeout(() => {
          pendingTimer.current = null
          if (firedInterim.current === fp) return
          firedInterim.current = fp
          runCommand(parsed.commands[parsed.commands.length - 1])
        }, 350)
      }
      return
    } else if (interimTokens.length === 0) {
      firedInterim.current = null
      pendingFp.current = null
    }
    if (held) {
      setView({ ...checkpoint.current, status: 'tracking' })
      return
    }
    // Don't align the wake word itself while the verb is still coming.
    const toAlign = pendingCommand(parsed.rest, wake) ? parsed.rest.slice(0, lastWakeIndex(parsed.rest, wake)) : parsed.rest
    const live = toAlign.length ? align(checkpoint.current, tokens, toAlign, performance.now()) : checkpoint.current
    setView(live)
    const word = cursorWord(tokens, live.cursor)
    if (word !== ctl.cursor) {
      lastSet.current = word
      ctl.setCursor(word)
    }
  }, [enabled, tokens, speech.finals, interimTokens, ctl, held, wake]) // eslint-disable-line react-hooks/exhaustive-deps

  return { enabled, setEnabled, state: view, interimTokens, held, setHeld, lastCommand, wakeText, setWakeText }
}

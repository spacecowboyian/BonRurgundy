import { describe, expect, it } from 'vitest'
import { align, cursorWord, INITIAL_STATE, tokenizeScript, wordToCursor, type AlignState } from './aligner'
import { normalize } from './normalize'
import { parseScript } from './script'

const SCRIPT = `Ladies and gentlemen, brothers and sisters, welcome back to the Church of Combustion. I am your humble servant, Reverend Rod Knox.

We gather here on this Sunday morning to speak to a loss. Three days into the 2026 season. Not even a full event.

Ian's times were quick. Run one: 54 seconds. Run two: 52. A cone on run three.`

const script = parseScript(SCRIPT)
const tokens = tokenizeScript(script)
const run = (text: string, state: AlignState = INITIAL_STATE) => align(state, tokens, normalize(text))

describe('aligner', () => {
  it('tracks an exact read', () => {
    const s = run('ladies and gentlemen brothers and sisters welcome back to the church of combustion')
    expect(s.status).toBe('tracking')
    expect(tokens[s.cursor - 1].norm).toBe('combustion')
    expect(script.words[cursorWord(tokens, s.cursor)].text).toBe('I')
  })

  it('tolerates recognizer near-misses', () => {
    const s = run('ladies and gentleman brothers and sister welcome back to the church of combustions')
    expect(tokens[s.cursor - 1].norm).toBe('combustion')
    expect(s.unmatched).toBe(0)
  })

  it('matches numbers spoken as digits', () => {
    const start = { ...INITIAL_STATE, cursor: wordToCursor(tokens, script.words.findIndex((w) => w.text === "Ian's")) }
    const s = run("Ian's times were quick run 1 54 seconds run 2 52", start)
    expect(tokens[s.cursor - 1].norm).toBe('two')
    expect(s.status).toBe('tracking')
  })

  it('skips ahead when the speaker drops a sentence', () => {
    const s = run('ladies and gentlemen we gather here on this sunday morning')
    expect(tokens[s.cursor - 1].norm).toBe('morning')
  })

  it('freezes on a riff and resumes on the next match', () => {
    let s = run('ladies and gentlemen brothers and sisters')
    const frozen = s.cursor
    s = run('by the way my truck broke down yesterday on the highway again', s)
    expect(s.status).toBe('riffing')
    expect(s.cursor).toBe(frozen)
    s = run('welcome back to the church of combustion', s)
    expect(s.status).toBe('tracking')
    expect(tokens[s.cursor - 1].norm).toBe('combustion')
  })

  it('jumps back on a re-read of an earlier phrase', () => {
    let s = run('ladies and gentlemen brothers and sisters welcome back to the church of combustion')
    const far = s.cursor
    s = run('brothers and sisters welcome', s)
    expect(s.cursor).toBeLessThan(far)
    expect(tokens[s.cursor - 1].norm).toBe('welcome')
  })

  it('does not jump far on stop words', () => {
    const s = run('the')
    // "the" first appears at "to the Church" (index ~9); beyond STOP_REACH so no match.
    expect(s.cursor).toBe(0)
    expect(s.unmatched).toBe(1)
  })

  it('maps word index to token cursor and back', () => {
    const wi = script.words.findIndex((w) => w.text === '2026')
    const c = wordToCursor(tokens, wi)
    expect(tokens[c].norm).toBe('twenty')
    expect(cursorWord(tokens, c)).toBe(wi)
  })
})

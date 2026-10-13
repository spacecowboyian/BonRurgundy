import { describe, expect, it } from 'vitest'
import { align, cursorWord, INITIAL_STATE, tokenizeScript, wordToCursor, type AlignState } from './aligner'
import { normalize } from './normalize'
import { parseScript } from './script'

const SCRIPT = `Ladies and gentlemen, brothers and sisters, welcome back to the Church of Combustion. I am your humble servant, Reverend Rod Knox.

We gather here on this Sunday morning to speak to a loss. Three days into the 2026 season. Not even a full event.

Ian's times were quick. Run one: 54 seconds. Run two: 52. A cone on run three. Well, you know how it goes.`

const script = parseScript(SCRIPT)
const tokens = tokenizeScript(script)
const T0 = 10_000
const run = (text: string, state: AlignState = INITIAL_STATE, now = T0) => align(state, tokens, normalize(text), now)
const last = (s: AlignState) => tokens[s.cursor - 1].norm

describe('aligner (flow-first)', () => {
  it('tracks an exact read', () => {
    const s = run('ladies and gentlemen brothers and sisters welcome back to the church of combustion')
    expect(s.status).toBe('tracking')
    expect(last(s)).toBe('combustion')
    expect(script.words[cursorWord(tokens, s.cursor)].text).toBe('I')
  })

  it('tolerates recognizer near-misses', () => {
    const s = run('ladies and gentleman brothers and sister welcome back to the church of combustions')
    expect(last(s)).toBe('combustion')
    expect(s.unmatched).toBe(0)
  })

  it('absorbs a dropped word', () => {
    const s = run('ladies gentlemen brothers sisters welcome back')
    expect(last(s)).toBe('back')
  })

  it('matches numbers spoken as digits', () => {
    const start = { ...INITIAL_STATE, cursor: wordToCursor(tokens, script.words.findIndex((w) => w.text === "Ian's")) }
    const s = run("Ian's times were quick run 1 54 seconds run 2 52", start)
    expect(last(s)).toBe('two')
  })

  it('ignores ad-lib filler even when those words appear later in the script', () => {
    // "well", "you know" exist near the end of the script; must not jump there.
    let s = run('ladies and gentlemen brothers and sisters')
    const at = s.cursor
    s = run('well you know hey', s, T0 + 500)
    expect(s.cursor).toBe(at)
    s = run('welcome back to the church', s, T0 + 1000)
    expect(last(s)).toBe('church')
  })

  it('does not jump on a single stray word that matches far ahead', () => {
    let s = run('ladies and gentlemen')
    s = run('seconds', s, T0 + 300) // appears in paragraph 3
    expect(last(s)).toBe('gentlemen')
  })

  it('re-syncs to a skipped-ahead passage only after a sustained mismatch and a phrase', () => {
    let s = run('ladies and gentlemen')
    // Reader skips a paragraph. First second: nothing happens.
    s = run('we gather here', s, T0 + 800)
    expect(last(s)).toBe('gentlemen')
    // Still talking off the expected path two seconds later: phrase re-sync.
    s = run('on this sunday morning', s, T0 + 2500)
    expect(last(s)).toBe('morning')
    expect(s.status).toBe('tracking')
  })

  it('freezes on a riff and resumes when the script comes back', () => {
    let s = run('ladies and gentlemen brothers and sisters')
    const frozen = s.cursor
    s = run('by the way my truck broke down yesterday on the highway again', s, T0 + 3000)
    expect(s.status).toBe('riffing')
    expect(s.cursor).toBe(frozen)
    s = run('welcome back to the church of combustion', s, T0 + 6000)
    expect(s.status).toBe('tracking')
    expect(last(s)).toBe('combustion')
  })

  it('jumps back on a re-read of an earlier phrase after a pause', () => {
    let s = run('ladies and gentlemen brothers and sisters welcome back to the church of combustion i am your humble')
    const far = s.cursor
    s = run('brothers and sisters welcome back', s, T0 + 2500)
    expect(s.cursor).toBeLessThan(far)
    expect(last(s)).toBe('back')
  })

  it('maps word index to token cursor and back', () => {
    const wi = script.words.findIndex((w) => w.text === '2026')
    const c = wordToCursor(tokens, wi)
    expect(tokens[c].norm).toBe('twenty')
    expect(cursorWord(tokens, c)).toBe(wi)
  })
})

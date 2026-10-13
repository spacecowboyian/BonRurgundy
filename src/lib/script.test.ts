import { describe, expect, it } from 'vitest'
import { parseScript } from './script'

describe('parseScript', () => {
  it('splits paragraphs on blank lines and indexes words flat', () => {
    const s = parseScript('Hello there,  world.\n\nSecond   para\nsame para.')
    expect(s.paragraphs.length).toBe(2)
    expect(s.words.map((w) => w.text)).toEqual(['Hello', 'there,', 'world.', 'Second', 'para', 'same', 'para.'])
    expect(s.words[3].para).toBe(1)
    expect(s.words[6].index).toBe(6)
  })
  it('handles empty input', () => {
    expect(parseScript('').words).toEqual([])
  })
})

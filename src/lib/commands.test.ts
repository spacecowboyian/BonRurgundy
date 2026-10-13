import { describe, expect, it } from 'vitest'
import { parseCommands, pendingCommand } from './commands'
import { normalize } from './normalize'

const p = (s: string) => parseCommands(normalize(s), ['bob', 'cue', 'q', 'queue'])

describe('parseCommands', () => {
  it('parses back/forward with counts and strips them', () => {
    expect(p('the goblin arrived cue back two lines')).toEqual({ commands: [{ kind: 'back', lines: 2 }], rest: [], lastAt: 3 })
    expect(p('cue forward 3 ready for war').commands).toEqual([{ kind: 'forward', lines: 3 }])
    expect(p('cue forward 3 ready for war').rest).toEqual(['ready', 'for', 'war'])
  })
  it('defaults to one line', () => {
    expect(p('cue back').commands).toEqual([{ kind: 'back', lines: 1 }])
    expect(p('cue go back a line').commands).toEqual([{ kind: 'back', lines: 1 }])
    expect(p('cue up').commands).toEqual([{ kind: 'back', lines: 1 }])
  })
  it('parses hold and go', () => {
    expect(p('cue hold').commands).toEqual([{ kind: 'hold' }])
    expect(p('cue go').commands).toEqual([{ kind: 'go' }])
    expect(p('cue go forward two').commands).toEqual([{ kind: 'forward', lines: 2 }])
  })
  it('ignores the wake word without a verb', () => {
    expect(p('the cue is nice').commands).toEqual([])
    expect(p('the cue is nice').rest).toEqual(['the', 'cue', 'is', 'nice'])
  })
  it('keeps only tokens after the last command', () => {
    const r = p('ian was ready cue back miles was ready cue forward the car')
    expect(r.commands.length).toBe(2)
    expect(r.rest).toEqual(['the', 'car'])
  })
  it('accepts wake aliases and a custom wake list', () => {
    expect(p('q back two').commands).toEqual([{ kind: 'back', lines: 2 }])
    expect(p('queue hold').commands).toEqual([{ kind: 'hold' }])
    expect(parseCommands(normalize('tango forward'), ['tango']).commands).toEqual([{ kind: 'forward', lines: 1 }])
    expect(parseCommands(normalize('cue forward'), ['tango']).commands).toEqual([])
    expect(parseCommands(normalize('bob back')).commands).toEqual([{ kind: 'back', lines: 1 }])
  })
  it('reports a pending command while the verb is still coming', () => {
    expect(pendingCommand(normalize('ready for war bob'))).toBe(true)
    expect(pendingCommand(normalize('bob back two'))).toBe(false)
    expect(pendingCommand(normalize('ready for war'))).toBe(false)
  })
})

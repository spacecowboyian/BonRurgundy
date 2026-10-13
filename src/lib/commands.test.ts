import { describe, expect, it } from 'vitest'
import { parseCommands, pendingCommand } from './commands'
import { normalize } from './normalize'

const p = (s: string) => parseCommands(normalize(s))

describe('parseCommands', () => {
  it('parses back/forward with counts and strips them', () => {
    expect(p('the goblin arrived prompter back two lines')).toEqual({ commands: [{ kind: 'back', lines: 2 }], rest: [], lastAt: 3 })
    expect(p('prompter forward 3 ready for war').commands).toEqual([{ kind: 'forward', lines: 3 }])
    expect(p('prompter forward 3 ready for war').rest).toEqual(['ready', 'for', 'war'])
  })
  it('defaults to one line', () => {
    expect(p('prompter back').commands).toEqual([{ kind: 'back', lines: 1 }])
    expect(p('prompter go back a line').commands).toEqual([{ kind: 'back', lines: 1 }])
    expect(p('prompter up').commands).toEqual([{ kind: 'back', lines: 1 }])
  })
  it('parses hold and go', () => {
    expect(p('prompter hold').commands).toEqual([{ kind: 'hold' }])
    expect(p('prompter go').commands).toEqual([{ kind: 'go' }])
    expect(p('prompter go forward two').commands).toEqual([{ kind: 'forward', lines: 2 }])
  })
  it('ignores the wake word without a verb', () => {
    expect(p('the prompter is nice').commands).toEqual([])
    expect(p('the prompter is nice').rest).toEqual(['the', 'prompter', 'is', 'nice'])
  })
  it('keeps only tokens after the last command', () => {
    const r = p('ian was ready prompter back miles was ready prompter forward the car')
    expect(r.commands.length).toBe(2)
    expect(r.rest).toEqual(['the', 'car'])
  })
  it('reports a pending command while the verb is still coming', () => {
    expect(pendingCommand(normalize('ready for war prompter'))).toBe(true)
    expect(pendingCommand(normalize('prompter back two'))).toBe(false)
    expect(pendingCommand(normalize('ready for war'))).toBe(false)
  })
})

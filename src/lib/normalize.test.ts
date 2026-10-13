import { describe, expect, it } from 'vitest'
import { normalize, numberToWords, similarity } from './normalize'

describe('normalize', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalize('Hello, World! "Quoted"')).toEqual(['hello', 'world', 'quoted'])
  })
  it('drops apostrophes so contractions match the recognizer', () => {
    expect(normalize("didn't it's")).toEqual(['didnt', 'its'])
  })
  it('expands numbers the same on both sides', () => {
    expect(normalize('Run one: 54 seconds.')).toEqual(['run', 'one', 'fifty', 'four', 'seconds'])
    expect(normalize('50.4')).toEqual(['fifty', 'point', 'four'])
    expect(normalize('2026')).toEqual(['twenty', 'twenty', 'six'])
    expect(normalize('March 22, 2026')).toEqual(['march', 'twenty', 'two', 'twenty', 'twenty', 'six'])
  })
  it('splits letter/digit boundaries', () => {
    expect(normalize('AW11 MR2 4AGE')).toEqual(['aw', 'eleven', 'mr', 'two', 'four', 'age'])
  })
  it('drops ellipses and dashes', () => {
    expect(normalize('ready... kind of — ready')).toEqual(['ready', 'kind', 'of', 'ready'])
  })
})

describe('numberToWords', () => {
  it('handles hundreds and thousands', () => {
    expect(numberToWords(120)).toEqual(['one', 'hundred', 'twenty'])
    expect(numberToWords(1000)).toEqual(['one', 'thousand'])
    expect(numberToWords(368)).toEqual(['three', 'hundred', 'sixty', 'eight'])
  })
})

describe('similarity', () => {
  it('scores near-misses high and different words low', () => {
    expect(similarity('congregation', 'congregations')).toBeGreaterThan(0.9)
    expect(similarity('goblin', 'gobbling')).toBeGreaterThan(0.7)
    expect(similarity('cat', 'dog')).toBe(0)
  })
})

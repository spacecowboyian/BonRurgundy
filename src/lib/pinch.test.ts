import { describe, expect, it } from 'vitest'
import { pinchFontSize } from './pinch'

describe('pinchFontSize', () => {
  it('scales proportionally in either direction', () => {
    expect(pinchFontSize(18, 100, 150)).toBe(27)
    expect(pinchFontSize(18, 100, 50)).toBe(9)
    expect(pinchFontSize(7, 100, 125)).toBe(8.75)
  })

  it('stays within the Settings range', () => {
    expect(pinchFontSize(18, 100, 1000)).toBe(30)
    expect(pinchFontSize(18, 100, 0)).toBe(3)
  })

  it('ignores invalid distances', () => {
    expect(pinchFontSize(18, 0, 100)).toBe(18)
    expect(pinchFontSize(18, 100, NaN)).toBe(18)
    expect(pinchFontSize(18, Infinity, 100)).toBe(18)
  })
})

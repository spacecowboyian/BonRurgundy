import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useScriptTouch } from './useScriptTouch'

afterEach(cleanup)

function touch(clientX: number, clientY = 100, target: EventTarget = document.body): Touch {
  return { clientX, clientY, target } as Touch
}

function send(type: string, touches: Touch[]) {
  const event = new TouchEvent(type, { touches, cancelable: true, bubbles: true })
  act(() => { document.body.dispatchEvent(event) })
  return event
}

function setup() {
  const options = { blocked: false, fontSize: 18, onFontSize: vi.fn(), onScroll: vi.fn() }
  const hook = renderHook((props) => useScriptTouch(props), { initialProps: options })
  return { ...hook, options }
}

describe('useScriptTouch', () => {
  it('resizes without scrolling and retains the starting scale across renders', () => {
    const { options, rerender } = setup()
    expect(send('touchstart', [touch(0), touch(100)]).defaultPrevented).toBe(true)
    expect(send('touchmove', [touch(0, 150), touch(150, 150)]).defaultPrevented).toBe(true)
    expect(options.onFontSize).toHaveBeenLastCalledWith(27)
    rerender({ ...options, fontSize: 27 })
    send('touchmove', [touch(0), touch(50)])
    expect(options.onFontSize).toHaveBeenLastCalledWith(9)
    expect(options.onScroll).not.toHaveBeenCalled()
  })

  it('supports vertical and diagonal pinches', () => {
    const { options } = setup()
    send('touchstart', [touch(0, 0), touch(0, 100)])
    send('touchmove', [touch(0, 0), touch(120, 160)])
    expect(options.onFontSize).toHaveBeenLastCalledWith(30)
    expect(options.onScroll).not.toHaveBeenCalled()
  })

  it('keeps single-finger swiping in both directions', () => {
    const { options } = setup()
    send('touchstart', [touch(0, 100)])
    send('touchmove', [touch(0, 60)])
    send('touchmove', [touch(0, 90)])
    expect(options.onScroll.mock.calls).toEqual([[40], [-30]])
    expect(options.onFontSize).not.toHaveBeenCalled()
  })

  it('switches from swipe to pinch and waits for every finger to lift afterward', () => {
    const { options } = setup()
    send('touchstart', [touch(0)])
    send('touchstart', [touch(0), touch(100)])
    send('touchmove', [touch(0, 150), touch(150, 150)])
    send('touchend', [touch(0, 150)])
    send('touchmove', [touch(0, 50)])
    send('touchstart', [touch(0), touch(100)])
    send('touchmove', [touch(0), touch(200)])
    expect(options.onFontSize).toHaveBeenCalledTimes(1)
    expect(options.onScroll).not.toHaveBeenCalled()
    send('touchend', [])
    send('touchstart', [touch(0)])
    send('touchmove', [touch(0, 80)])
    expect(options.onScroll).toHaveBeenCalledWith(20)
  })

  it('does not handle gestures while the editor or settings is open', () => {
    const { options, rerender } = setup()
    send('touchstart', [touch(0), touch(100)])
    rerender({ ...options, blocked: true })
    send('touchmove', [touch(0), touch(150)])
    send('touchstart', [touch(0)])
    send('touchmove', [touch(0, 80)])
    expect(options.onScroll).not.toHaveBeenCalled()
    expect(options.onFontSize).not.toHaveBeenCalled()
    rerender(options)
    send('touchmove', [touch(0, 50)])
    expect(options.onScroll).not.toHaveBeenCalled()
  })

  it.each(['button', '.bar', '.sheet', '.scrollbar', '.dock', '.center-dock', '.mic', '.donate-sheet'])(
    'ignores gestures involving %s, even when the other finger is on the script',
    (selector) => {
      const { options } = setup()
      const control = document.createElement(selector === 'button' ? 'button' : 'div')
      control.className = selector.slice(1)
      send('touchstart', [touch(0), touch(100, 100, control)])
      send('touchmove', [touch(0), touch(200, 100, control)])
      send('touchend', [touch(0)])
      send('touchmove', [touch(0, 50)])
      expect(options.onFontSize).not.toHaveBeenCalled()
      expect(options.onScroll).not.toHaveBeenCalled()
    },
  )

  it('clears cancelled gestures and allows a fresh swipe', () => {
    const { options } = setup()
    send('touchstart', [touch(0), touch(100)])
    send('touchcancel', [touch(0)])
    send('touchmove', [touch(0, 50)])
    expect(options.onScroll).not.toHaveBeenCalled()
    expect(options.onFontSize).not.toHaveBeenCalled()
    send('touchend', [])
    send('touchstart', [touch(0)])
    send('touchmove', [touch(0, 80)])
    expect(options.onScroll).toHaveBeenCalledWith(20)
  })

  it('ignores extra fingers until all are lifted', () => {
    const { options } = setup()
    send('touchstart', [touch(0), touch(100)])
    send('touchstart', [touch(0), touch(100), touch(200)])
    send('touchend', [touch(0), touch(100)])
    send('touchmove', [touch(0), touch(200)])
    expect(options.onFontSize).not.toHaveBeenCalled()
    expect(options.onScroll).not.toHaveBeenCalled()
  })

  it('ignores a pinch starting with coincident fingers', () => {
    const { options } = setup()
    send('touchstart', [touch(0), touch(0)])
    send('touchmove', [touch(0), touch(100)])
    expect(options.onFontSize).not.toHaveBeenCalled()
  })

  it('removes listeners on unmount', () => {
    const { options, unmount } = setup()
    send('touchstart', [touch(0), touch(100)])
    unmount()
    send('touchmove', [touch(0), touch(150)])
    expect(options.onFontSize).not.toHaveBeenCalled()
  })
})

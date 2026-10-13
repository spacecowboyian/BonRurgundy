import { useCallback, useRef } from 'react'

/**
 * Long-press handlers for a button. Fires `onLong` after `ms` of holding and
 * swallows the click that follows, so a long press never also triggers the
 * button's normal action. Works for touch and mouse.
 */
export function useLongPress(onLong: () => void, ms = 450) {
  const timer = useRef<number | null>(null)
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return
      fired.current = false
      clear()
      timer.current = window.setTimeout(() => {
        fired.current = true
        onLong()
      }, ms)
    },
    [onLong, ms, clear],
  )

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (fired.current) {
      e.preventDefault()
      e.stopPropagation()
      fired.current = false
    }
  }, [])

  return {
    onPointerDown,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClickCapture,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(), // iOS long-press menu
  }
}

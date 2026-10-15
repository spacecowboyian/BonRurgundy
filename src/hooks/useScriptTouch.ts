import { useEffect, useLayoutEffect, useRef } from 'react'
import { pinchFontSize } from '../lib/pinch'

interface Options {
  blocked: boolean
  fontSize: number
  onFontSize: (size: number) => void
  onScroll: (dy: number) => void
}

const controls = 'input,select,textarea,button,a,.bar,.sheet,.sheet-backdrop,.editor,.scrollbar,.dock,.center-dock,.mic,.donate-sheet'
const distance = (touches: TouchList) =>
  Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)

export function useScriptTouch(options: Options) {
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    if (options.blocked) return
    let touchY: number | null = null
    let pinch: { distance: number; fontSize: number } | null = null
    let ignore = false

    const onStart = (e: TouchEvent) => {
      if (ignore) return
      if (e.touches.length > 2 || Array.from(e.touches).some((t) =>
        t.target instanceof Element && t.target.closest(controls),
      )) {
        ignore = true
        touchY = null
        pinch = null
        return
      }
      if (e.touches.length === 2) {
        touchY = null
        const startDistance = distance(e.touches)
        if (startDistance <= 0) {
          ignore = true
          return
        }
        pinch = { distance: startDistance, fontSize: latest.current.fontSize }
        if (e.cancelable) e.preventDefault()
      } else if (e.touches.length === 1) {
        touchY = e.touches[0].clientY
      }
    }
    const onMove = (e: TouchEvent) => {
      if (ignore) return
      if (pinch && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault()
        latest.current.onFontSize(pinchFontSize(pinch.fontSize, pinch.distance, distance(e.touches)))
      } else if (touchY !== null && e.touches.length === 1) {
        const y = e.touches[0].clientY
        latest.current.onScroll(touchY - y)
        touchY = y
      }
    }
    const onEnd = (e: TouchEvent) => {
      // After a pinch, lift every finger before allowing another swipe.
      if (pinch || e.type === 'touchcancel') ignore = true
      touchY = null
      pinch = null
      if (e.touches.length === 0) ignore = false
    }
    window.addEventListener('touchstart', onStart, { passive: false })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [options.blocked])
}

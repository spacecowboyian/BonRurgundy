/** Scale from the gesture's starting size, using the same limits as Settings. */
export function pinchFontSize(fontSize: number, startDistance: number, distance: number): number {
  if (startDistance <= 0 || !Number.isFinite(distance) || !Number.isFinite(startDistance)) return fontSize
  return Math.max(3, Math.min(30, fontSize * distance / startDistance))
}

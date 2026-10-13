import { useCallback, useEffect, useState } from 'react'

/** useState persisted to localStorage under `key`. */
export function useLocalState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw == null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* quota or private mode; ignore */
    }
  }, [key, value])
  const set = useCallback((v: T | ((prev: T) => T)) => setValue(v), [])
  return [value, set]
}

/** Text normalization shared by script and transcript so both sides compare equal. */

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

export function numberToWords(n: number): string[] {
  if (!Number.isFinite(n) || n < 0) return [String(n)]
  if (n < 20) return [ONES[n]]
  if (n < 100) {
    const t = Math.floor(n / 10)
    const o = n % 10
    return o ? [TENS[t], ONES[o]] : [TENS[t]]
  }
  if (n < 1000) {
    const h = Math.floor(n / 100)
    const r = n % 100
    return [ONES[h], 'hundred', ...(r ? numberToWords(r) : [])]
  }
  // Years like 2026 are spoken "twenty twenty six"; the recognizer emits digits
  // either way, so we pick one spoken form and apply it to both sides.
  if (n >= 1100 && n < 10000 && n % 100 !== 0) {
    return [...numberToWords(Math.floor(n / 100)), ...numberToWords(n % 100)]
  }
  if (n < 1_000_000) {
    const k = Math.floor(n / 1000)
    const r = n % 1000
    return [...numberToWords(k), 'thousand', ...(r ? numberToWords(r) : [])]
  }
  return [String(n)]
}

function expandNumeric(tok: string): string[] {
  // "50.4" -> fifty point four ; "1,200" -> one thousand two hundred
  const clean = tok.replace(/,/g, '')
  if (/^\d+\.\d+$/.test(clean)) {
    const [a, b] = clean.split('.')
    return [...numberToWords(Number(a)), 'point', ...b.split('').map((d) => ONES[Number(d)])]
  }
  if (/^\d+$/.test(clean)) return numberToWords(Number(clean))
  return [clean]
}

/**
 * Turn a chunk of text into comparable tokens. Lowercase, strip punctuation,
 * split letter/digit boundaries ("aw11" -> aw, eleven), expand digits.
 */
export function normalize(text: string): string[] {
  const out: string[] = []
  const raw = text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9.,\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  for (let t of raw) {
    t = t.replace(/^[.,]+|[.,]+$/g, '')
    if (!t) continue
    // split "aw11" / "4age" / "e1" into letter and digit runs
    const parts = t.match(/[a-z]+|[0-9][0-9.,]*/g) ?? []
    for (const p of parts) {
      if (/^\d/.test(p)) out.push(...expandNumeric(p))
      else out.push(p)
    }
  }
  return out
}

/** Levenshtein similarity in [0,1]. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1
  const n = a.length
  const m = b.length
  if (!n || !m) return 0
  let prev = new Array<number>(m + 1)
  let cur = new Array<number>(m + 1)
  for (let j = 0; j <= m; j++) prev[j] = j
  for (let i = 1; i <= n; i++) {
    cur[0] = i
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, cur] = [cur, prev]
  }
  return 1 - prev[m] / Math.max(n, m)
}

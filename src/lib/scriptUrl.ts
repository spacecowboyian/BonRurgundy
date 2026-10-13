/**
 * Load a script from a URL given as `?script=<url>` (or `#script=<url>`).
 * Lets an AI agent or a friend hand someone a link that opens the prompter
 * with the script already in it. Only text is read; it is rendered as text.
 */

const MAX_BYTES = 300_000

/** Turn common "view" URLs into their raw-text equivalents. */
export function toRawUrl(input: string): string {
  let u: URL
  try {
    u = new URL(input.trim())
  } catch {
    return input
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return input
  const parts = u.pathname.split('/').filter(Boolean)
  // github.com/user/repo/blob/branch/path -> raw.githubusercontent.com/user/repo/branch/path
  if (u.hostname === 'github.com' && parts.length >= 5 && parts[2] === 'blob') {
    return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts.slice(3).join('/')}`
  }
  // gist.github.com/user/id -> gist.githubusercontent.com/user/id/raw
  if (u.hostname === 'gist.github.com' && parts.length >= 2) {
    return `https://gist.githubusercontent.com/${parts[0]}/${parts[1]}/raw`
  }
  // pastebin.com/ID -> pastebin.com/raw/ID
  if (u.hostname === 'pastebin.com' && parts.length === 1) {
    return `https://pastebin.com/raw/${parts[0]}`
  }
  // Google Docs: /document/d/ID/... -> export as plain text
  if (u.hostname === 'docs.google.com' && parts[0] === 'document' && parts[1] === 'd' && parts[2]) {
    return `https://docs.google.com/document/d/${parts[2]}/export?format=txt`
  }
  // Dropbox share links: dl=0 -> dl=1
  if (/(^|\.)dropbox\.com$/.test(u.hostname)) {
    u.searchParams.set('dl', '1')
    return u.toString()
  }
  return u.toString()
}

/** Read `script` from the query string or the hash. */
export function scriptUrlFromLocation(loc: Location = window.location): string | null {
  const q = new URLSearchParams(loc.search).get('script')
  if (q) return q
  const h = new URLSearchParams(loc.hash.replace(/^#/, '')).get('script')
  return h || null
}

export async function fetchScript(url: string): Promise<string> {
  const raw = toRawUrl(url)
  const res = await fetch(raw, { mode: 'cors', redirect: 'follow' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const len = Number(res.headers.get('content-length') || 0)
  if (len > MAX_BYTES) throw new Error('file is too large for a script')
  const text = await res.text()
  if (text.length > MAX_BYTES) throw new Error('file is too large for a script')
  if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('that link returned a web page, not a text or markdown file')
  return text
}

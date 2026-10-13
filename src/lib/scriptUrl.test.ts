import { describe, expect, it } from 'vitest'
import { toRawUrl } from './scriptUrl'

describe('toRawUrl', () => {
  it('rewrites github blob links', () => {
    expect(toRawUrl('https://github.com/u/r/blob/main/docs/script.md')).toBe('https://raw.githubusercontent.com/u/r/main/docs/script.md')
  })
  it('rewrites gists', () => {
    expect(toRawUrl('https://gist.github.com/u/abc123')).toBe('https://gist.githubusercontent.com/u/abc123/raw')
  })
  it('rewrites pastebin and google docs', () => {
    expect(toRawUrl('https://pastebin.com/XyZ')).toBe('https://pastebin.com/raw/XyZ')
    expect(toRawUrl('https://docs.google.com/document/d/ID123/edit?usp=sharing')).toBe('https://docs.google.com/document/d/ID123/export?format=txt')
  })
  it('flips dropbox dl=0 to dl=1', () => {
    expect(toRawUrl('https://www.dropbox.com/s/abc/script.md?dl=0')).toBe('https://www.dropbox.com/s/abc/script.md?dl=1')
  })
  it('leaves raw urls and junk alone', () => {
    expect(toRawUrl('https://raw.githubusercontent.com/u/r/main/a.md')).toBe('https://raw.githubusercontent.com/u/r/main/a.md')
    expect(toRawUrl('not a url')).toBe('not a url')
  })
})

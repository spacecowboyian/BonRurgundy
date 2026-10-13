import readme from '../../README.md?raw'
import { tidyScript } from '../lib/tidy'

/** The sample script is the README's opening section (under the title, before the first ## heading), tidied for reading aloud. */
function section(md: string, heading: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n')
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `${heading}`.toLowerCase())
  if (start < 0) return md
  let end = lines.length
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##?\s/.test(lines[i])) {
      end = i
      break
    }
  }
  return lines.slice(start + 1, end).join('\n')
}

export const SAMPLE_SCRIPT = tidyScript(section(readme, '# BonRurgundy'))

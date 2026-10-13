import { describe, expect, it } from 'vitest'
import { tidyScript } from './tidy'

describe('tidyScript', () => {
  it('strips markdown scaffolding and speaker labels', () => {
    const input = `# TITLE
## "Sub"

**THE REVEREND:**

"Ladies and **gentlemen**, welcome."

---

*[beat, exhale]*

> quoted line`
    expect(tidyScript(input)).toBe('Ladies and gentlemen, welcome.\n\nquoted line')
  })
  it('drops code fences, tables, images, links and bare urls', () => {
    const input = `Intro line with a [link](https://x.y) and \`code\`.

\`\`\`bash
npm install
\`\`\`

| Say | Does |
| --- | --- |
| bon back | up |

![pic](a.png)
Visit https://example.com now.
Live at: https://example.com`
    expect(tidyScript(input)).toBe('Intro line with a link and code.\n\nVisit now.\nLive at.')
  })
})

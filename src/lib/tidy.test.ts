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
})

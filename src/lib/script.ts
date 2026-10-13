/** Script text model shared by the editor, the prompter and (later) the aligner. */

export interface Word {
  /** Index into the flat word list. The prompter cursor is one of these. */
  index: number
  /** Original text, punctuation intact, for display. */
  text: string
  /** Paragraph this word belongs to. */
  para: number
}

export interface ParsedScript {
  words: Word[]
  paragraphs: Word[][]
}

export function parseScript(text: string): ParsedScript {
  const paragraphs: Word[][] = []
  const words: Word[] = []
  text
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((p, pi) => {
      const list: Word[] = []
      for (const t of p.split(/\s+/)) {
        const w = { index: words.length, text: t, para: pi }
        words.push(w)
        list.push(w)
      }
      paragraphs.push(list)
    })
  return { words, paragraphs }
}

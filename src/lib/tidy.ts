/**
 * Strip common markdown / screenplay scaffolding so a pasted script reads as
 * plain spoken copy. Headings are kept as their own paragraph (minus the #s) so
 * they work as landing points for next/previous. Drops rules, emphasis markers,
 * bracketed stage directions, and ALL-CAPS speaker labels ending in a colon.
 */
export function tidyScript(text: string): string {
  let inFence = false
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      let l = line.trim()
      if (/^```/.test(l)) {
        inFence = !inFence
        return ''
      }
      if (inFence) return ''
      if (/^\|/.test(l)) return '' // markdown table rows
      if (/^!\[/.test(l)) return '' // images
      l = l.replace(/<[^>]+>/g, '').trim() // html tags (logo header, <br>, etc.)
      if (!l) return ''
      if (/^#{1,6}\s/.test(l)) {
        // Heading: keep the words as a paragraph of their own.
        const h = l.replace(/^#{1,6}\s+/, '').replace(/\s+#+$/, '').replace(/[*_`]/g, '').replace(/^["“]|["”]$/g, '').trim()
        return h ? `\n${h}\n` : ''
      }
      if (/^(---+$|\*\*\*+$|___+$)/.test(l)) return ''
      if (/^\*?\[.*\]\*?$/.test(l)) return '' // *[stage direction]*
      if (/^\*\*?[A-Z][A-Z .'’-]{2,}:?\*\*?$/.test(l) || /^[A-Z][A-Z .'’-]{2,}:$/.test(l)) return '' // SPEAKER:
      l = l.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/__([^_]+)__/g, '$1')
      l = l.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url) -> text
      l = l.replace(/`([^`]*)`/g, '$1')
      l = l.replace(/https?:\/\/\S+/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1') // bare URLs don't read aloud
      l = l.replace(/:\s*$/, '.') // "Live at:" with the URL gone reads better as a sentence
      l = l.replace(/^>\s?/, '').replace(/^[-*]\s+/, '')
      l = l.replace(/^["“]|["”]$/g, '')
      return l
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

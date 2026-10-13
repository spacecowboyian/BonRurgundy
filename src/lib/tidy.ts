/**
 * Strip common markdown / screenplay scaffolding so a pasted script reads as
 * plain spoken copy. Conservative: drops headings, rules, emphasis markers,
 * bracketed stage directions, and ALL-CAPS speaker labels ending in a colon.
 */
export function tidyScript(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => {
      let l = line.trim()
      if (/^(#{1,6}\s|---+$|\*\*\*+$|___+$)/.test(l)) return ''
      if (/^\*?\[.*\]\*?$/.test(l)) return '' // *[stage direction]*
      if (/^\*\*?[A-Z][A-Z .'’-]{2,}:?\*\*?$/.test(l) || /^[A-Z][A-Z .'’-]{2,}:$/.test(l)) return '' // SPEAKER:
      l = l.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/__([^_]+)__/g, '$1')
      l = l.replace(/^>\s?/, '').replace(/^[-*]\s+/, '')
      l = l.replace(/^["“]|["”]$/g, '')
      return l
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

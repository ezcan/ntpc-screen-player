export type ThemeSegment =
  | { kind: 'text'; text: string }
  | { kind: 'keyword'; text: string; index: number }

// Literal matching preserves the original text, punctuation and whitespace.
// At the same position a longer phrase wins, so emphasis never nests or overlaps.
export function splitThemeHighlights(text: string, terms: readonly string[]): ThemeSegment[] {
  const keywords = [...new Set(terms.map((term) => term.trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
  const segments: ThemeSegment[] = []
  let cursor = 0
  let keywordIndex = 0
  while (cursor < text.length) {
    let nextPosition = -1
    let nextKeyword = ''
    for (const keyword of keywords) {
      const position = text.indexOf(keyword, cursor)
      if (position !== -1 && (nextPosition === -1 || position < nextPosition)) {
        nextPosition = position
        nextKeyword = keyword
      }
    }
    if (nextPosition === -1) {
      segments.push({ kind: 'text', text: text.slice(cursor) })
      break
    }
    if (nextPosition > cursor) segments.push({ kind: 'text', text: text.slice(cursor, nextPosition) })
    segments.push({ kind: 'keyword', text: nextKeyword, index: keywordIndex++ })
    cursor = nextPosition + nextKeyword.length
  }
  return segments
}

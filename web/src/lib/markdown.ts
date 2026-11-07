import { sanitizeHtml } from './sanitize'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(text: string): string {
  return esc(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

/** Minimal markdown (headings, lists, bold/italic, code, http links, paragraphs) to sanitized HTML. */
export function renderMarkdown(md: string): string {
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  let para: string[] = []
  const flushPara = () => { if (para.length) out.push(`<p>${para.join('<br>')}</p>`); para = [] }
  const closeList = () => { if (list) out.push(`</${list}>`); list = null }
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    const li = line.match(/^\s*([-*]|\d+\.)\s+(.*)$/)
    if (h) { flushPara(); closeList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`) }
    else if (li) {
      flushPara()
      const kind = /\d/.test(li[1]) ? 'ol' : 'ul'
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind }
      out.push(`<li>${inline(li[2])}</li>`)
    } else if (!line.trim()) { flushPara(); closeList() }
    else { closeList(); para.push(inline(line.trim())) }
  }
  flushPara(); closeList()
  return sanitizeHtml(out.join(''))
}

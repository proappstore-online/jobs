const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'blockquote', 'code', 'pre',
])

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'rel']),
}

/**
 * Strips dangerous HTML tags and attributes. Keeps only safe formatting tags
 * (p, strong, ul, li, h3, a with href, etc.). No external dependencies.
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  cleanNode(doc.body)
  return doc.body.innerHTML
}

function cleanNode(node: Node): void {
  const toRemove: Node[] = []

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue

    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element
      const tag = el.tagName.toLowerCase()

      if (!ALLOWED_TAGS.has(tag)) {
        // Keep children, remove the tag itself
        while (el.firstChild) {
          node.insertBefore(el.firstChild, el)
        }
        toRemove.push(el)
        continue
      }

      // Strip disallowed attributes
      const allowedSet = ALLOWED_ATTRS[tag]
      for (const attr of Array.from(el.attributes)) {
        if (!allowedSet?.has(attr.name)) {
          el.removeAttribute(attr.name)
        }
      }

      // Force safe link behavior
      if (tag === 'a') {
        const href = el.getAttribute('href') ?? ''
        if (href.startsWith('javascript:') || href.startsWith('data:')) {
          el.setAttribute('href', '#')
        }
        el.setAttribute('target', '_blank')
        el.setAttribute('rel', 'noopener noreferrer')
      }

      cleanNode(el)
    } else {
      toRemove.push(child)
    }
  }

  for (const n of toRemove) {
    node.removeChild(n)
  }
}

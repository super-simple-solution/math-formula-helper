// Queries the first matching element inside a context, defaulting to the document.
export function getEle(el: string, context: HTMLElement) {
  if (!el) return
  return (context || document).querySelector(el)
}

// Queries all matching elements inside a context, defaulting to the document.
export function $$(el: string, context: HTMLElement) {
  if (!el) return []
  return Array.from((context || document).querySelectorAll(el))
}

// Generates a short non-cryptographic id for local copy-history entries.
export function uuid() {
  return (Math.random() + 1).toString(36).substring(4)
}

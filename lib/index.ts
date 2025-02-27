export function getEle(el: string, context: HTMLElement) {
  if (!el) return
  return (context || document).querySelector(el)
}

export function $$(el: string, context: HTMLElement) {
  if (!el) return []
  return Array.from((context || document).querySelectorAll(el))
}

export function uuid() {
  return (Math.random() + 1).toString(36).substring(4)
}

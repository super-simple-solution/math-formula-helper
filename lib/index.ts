import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

const toastConfig = {
  duration: 2000,
  position: 'right',
  close: true,
  style: {
    background: 'linear-gradient(to right, #22c55e, #96c93d)',
  },
} as const

export function toast({ text }: { text: string }) {
  if (!text) return
  Toastify({
    ...toastConfig,
    text,
  }).showToast()
}

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

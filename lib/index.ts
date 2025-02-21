import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

const toastConfig = {
  duration: 3000,
  position: 'right',
  style: {
    background: 'linear-gradient(to right, #00b09b, #96c93d)',
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

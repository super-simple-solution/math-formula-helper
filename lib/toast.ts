import Toastify from 'toastify-js'
import 'toastify-js/src/toastify.css'

const toastConfig = {
  duration: 2000,
  position: 'right',
} as const

export enum ToastType {
  Success = 'success',
  Warning = 'warning',
  Info = 'info',
  Danger = 'danger',
}

// color from element-plus, color: warning/success/info/danger, bg: light-9, border: light-8
const toastStyleMap: Record<ToastType, { [cssRule: string]: string }> = {
  [ToastType.Success]: {
    background: 'rgb(239.8, 248.9, 235.3)',
    color: '#67c23a',
    border: '1px solid rgb(224.6, 242.8, 215.6)'
  },
  [ToastType.Warning]: {
    background: 'rgb(252.5, 245.7, 235.5)',
    color: '#e6a23c',
    border: '1px solid rgb(250, 236.4, 216)'
  },
  [ToastType.Info]: {
    background: 'rgb(243.9, 244.2, 244.8)',
    color: '#909399',
    border: '1px solid rgb(232.8, 233.4, 234.6)'
  },
  [ToastType.Danger]: {
    background: 'rgb(254, 240.3, 240.3)',
    color: '#f56c6c',
    border: '1px solid rgb(253, 225.6, 225.6)'
  },
}

type ToastMessage = { text: string; type?: ToastType }

export function toast({ text, type = ToastType.Success }: ToastMessage) {
  if (!text) return
  Toastify({
    ...toastConfig,
    style: {
      ...toastStyleMap[type],
    },
    text,
  }).showToast()
}
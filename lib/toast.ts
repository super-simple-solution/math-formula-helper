const toastRootId = 'math-formula-helper-toast-root'
const toastRootAttr = 'data-mfh-toast-root'

const toastConfig = {
  duration: 2000,
} as const

export enum ToastType {
  Success = 'success',
  Warning = 'warning',
  Info = 'info',
  Danger = 'danger',
}

const toastStyleMap: Record<ToastType, { bg: string; border: string; color: string }> = {
  [ToastType.Success]: {
    bg: '#f0f9eb',
    color: '#3f7d20',
    border: '#d8efc9',
  },
  [ToastType.Warning]: {
    bg: '#fdf6ec',
    color: '#9f5f12',
    border: '#faecd8',
  },
  [ToastType.Info]: {
    bg: '#f4f4f5',
    color: '#606266',
    border: '#e9e9eb',
  },
  [ToastType.Danger]: {
    bg: '#fef0f0',
    color: '#b83232',
    border: '#fde2e2',
  },
}

type ToastMessage = { text: string; type?: ToastType }

export function toast({ text, type = ToastType.Success }: ToastMessage) {
  if (!text || typeof document === 'undefined') return

  const container = getToastContainer()
  const item = document.createElement('div')
  item.className = `toast toast-${type}`
  item.textContent = text

  const style = toastStyleMap[type]
  item.style.setProperty('--mfh-toast-bg', style.bg)
  item.style.setProperty('--mfh-toast-color', style.color)
  item.style.setProperty('--mfh-toast-border', style.border)

  container.appendChild(item)

  window.setTimeout(() => {
    item.classList.add('toast-leave')
    window.setTimeout(() => item.remove(), 180)
  }, toastConfig.duration)
}

function getToastContainer() {
  const existing = document.querySelector(`[${toastRootAttr}="true"]`)
  const existingRoot = existing?.shadowRoot?.querySelector('.toast-container')
  if (existingRoot instanceof HTMLElement) return existingRoot

  const host = document.createElement('div')
  if (!document.getElementById(toastRootId)) host.id = toastRootId
  host.setAttribute(toastRootAttr, 'true')
  host.style.all = 'initial'
  host.style.position = 'fixed'
  host.style.inset = '0'
  host.style.zIndex = '2147483647'
  host.style.pointerEvents = 'none'

  const shadow = host.attachShadow({ mode: 'open' })
  shadow.innerHTML = `
    <style>
      :host {
        all: initial;
      }

      .toast-container {
        box-sizing: border-box;
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        display: flex;
        width: min(360px, calc(100vw - 32px));
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        pointer-events: none;
      }

      .toast {
        box-sizing: border-box;
        max-width: 100%;
        min-height: 38px;
        padding: 9px 14px;
        border: 1px solid var(--mfh-toast-border);
        border-radius: 6px;
        background: var(--mfh-toast-bg);
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
        color: var(--mfh-toast-color);
        font: 13px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        overflow-wrap: anywhere;
        opacity: 1;
        transform: translateY(0);
        transition: opacity 160ms ease, transform 160ms ease;
        white-space: normal;
        pointer-events: none;
      }

      .toast-leave {
        opacity: 0;
        transform: translateY(-4px);
      }
    </style>
    <div class="toast-container" aria-live="polite" aria-atomic="true"></div>
  `

  document.documentElement.appendChild(host)
  return shadow.querySelector('.toast-container') as HTMLElement
}

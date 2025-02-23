import { storage } from 'wxt/storage'
import { defaultLatexSymbol } from '../latex'
import type { LatexHistory, Prefer } from './types'
export type { Prefer, LatexHistory }

const PREFER = 'sync:preference'
const LATEX_HISTORY = 'local:latex_history'

export async function getPreference() {
  const prefer = await storage.getItem<Prefer>(PREFER)
  const { show_toast = true, format_signs = defaultLatexSymbol } = prefer || {}
  return { show_toast, format_signs }
}

export async function setPreference(data: Prefer) {
  await storage.setItem<Prefer>(PREFER, data)
}

export async function watchPreference(cb: (newPrefer: Prefer) => void) {
  storage.watch<Prefer>(PREFER, (newPrefer) => newPrefer && cb(newPrefer))
}

const MAX_LENGTH = 100

export const LatexQueue = {
  async enqueue(item: LatexHistory): Promise<void> {
    const current = await this.getQueue()
    await storage.setItem<LatexHistory[]>(LATEX_HISTORY, [...current, item].slice(-MAX_LENGTH))
  },

  async getQueue(): Promise<LatexHistory[]> {
    return (await storage.getItem<LatexHistory[]>(LATEX_HISTORY)) || []
  },

  async clear(): Promise<void> {
    await storage.setItem(LATEX_HISTORY, [])
  },
}

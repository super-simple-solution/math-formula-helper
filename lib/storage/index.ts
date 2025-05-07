import { type Unwatch, storage } from 'wxt/storage'
import { defaultLatexSymbol } from '../latex'
import type { LatexHistory, Pattern, PatternCache, Prefer } from './types'
export type { Prefer, LatexHistory }

const PREFER = 'sync:preference'
const LATEX_HISTORY = 'local:latex_history'
const PATTERN = 'local:pattern'

export async function getPreference() {
  const prefer = await storage.getItem<Prefer>(PREFER)
  const { show_toast = true, format_signs = defaultLatexSymbol } = prefer || {}
  return { show_toast, format_signs }
}

export async function setPreference(data: Prefer) {
  await storage.setItem<Prefer>(PREFER, data)
}

export function watchPreference(cb: (newValue: Prefer) => void): Unwatch  {
  return storage.watch<Prefer>(PREFER, (newValue) => newValue && cb(newValue))
}

const MAX_LENGTH = 200

export const LatexQueue = {
  async enqueue(item: LatexHistory): Promise<void> {
    const current = await this.getQueue()
    await storage.setItem<LatexHistory[]>(LATEX_HISTORY, [...current, item].slice(-MAX_LENGTH))
  },

  async getQueue(): Promise<LatexHistory[]> {
    return (await storage.getItem<LatexHistory[]>(LATEX_HISTORY)) || []
  },

  async remove(idList: string[]) {
    const current = await this.getQueue()
    await storage.setItem<LatexHistory[]>(LATEX_HISTORY, current.filter(item => !idList.includes(item.id)))
  },

  async clear(): Promise<void> {
    await storage.setItem(LATEX_HISTORY, [])
  },

  watch(cb: (newValue: LatexHistory[]) => void): Unwatch {
    return storage.watch<LatexHistory[]>(LATEX_HISTORY, (newValue) => newValue && cb(newValue))
  }
}

export async function getPattern() {
  const pattern = await storage.getItem<PatternCache>(PATTERN)
  return pattern && Object.keys(pattern).length ? pattern: {data: [], time: Date.now()}
}

export async function setPattern(data: Pattern[]) {
  await storage.setItem<PatternCache>(PATTERN, {
    time: Date.now(),
    data
  })
}

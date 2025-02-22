import { storage } from 'wxt/storage'
import { LatexSymbol } from '../latex'
import type { Prefer } from './types'

export type { Prefer }

const PREFER = 'sync:preference'

export async function getPreference() {
  const prefer = await storage.getItem<Prefer>(PREFER)
  const { show_toast = true, format_signs = LatexSymbol.Inline } = prefer || {}
  return { show_toast, format_signs }
}

export async function setPreference(data: Prefer) {
  await storage.setItem<Prefer>(PREFER, data)
}

export async function watchPreference(cb: (newPrefer: Prefer) => void) {
  storage.watch<Prefer>(PREFER, (newPrefer) => newPrefer && cb(newPrefer))
}
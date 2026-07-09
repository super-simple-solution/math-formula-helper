import type { Unwatch } from 'wxt/utils/storage'
import {
  defaultBracePolicy,
  defaultEnvironmentPolicy,
  defaultHistoryValueMode,
  defaultLatexSymbol,
  defaultNormalization,
  defaultOutputProfile,
  defaultTagPolicy,
} from '../latex'
import type { LatexHistory, Pattern, PatternCache, Prefer } from './types'
export type { Prefer, LatexHistory }

const PREFER = 'sync:preference'
const LATEX_HISTORY = 'local:latex_history'
const PATTERN = 'local:pattern'

// Loads preference from sync storage and fills new fields for older installations.
export async function getPreference() {
  const prefer = await storage.getItem<Prefer>(PREFER)
  return withPreferenceDefaults(prefer)
}

// Persists the complete preference object from the options page.
export async function setPreference(data: Prefer) {
  await storage.setItem<Prefer>(PREFER, data)
}

// Watches preference changes and normalizes missing fields before notifying callers.
export function watchPreference(cb: (newValue: Prefer) => void): Unwatch {
  return storage.watch<Prefer>(PREFER, (newValue) => {
    if (newValue) cb(withPreferenceDefaults(newValue))
  })
}

// Backfills defaults so content scripts can rely on every option being present.
export function withPreferenceDefaults(prefer?: Partial<Prefer> | null): Prefer {
  return {
    show_toast: prefer?.show_toast ?? true,
    show_source_quality: prefer?.show_source_quality ?? true,
    selection_copy: prefer?.selection_copy ?? true,
    history_value: prefer?.history_value ?? defaultHistoryValueMode,
    output_profile: prefer?.output_profile ?? defaultOutputProfile,
    format_signs: prefer?.format_signs ?? defaultLatexSymbol,
    normalization: prefer?.normalization ?? defaultNormalization,
    tag_policy: prefer?.tag_policy ?? defaultTagPolicy,
    environment_policy: prefer?.environment_policy ?? defaultEnvironmentPolicy,
    brace_policy: prefer?.brace_policy ?? defaultBracePolicy,
  }
}

const MAX_LENGTH = 200

export const LatexQueue = {
  // Adds one copy-history record and caps the queue to the latest MAX_LENGTH entries.
  async enqueue(item: LatexHistory): Promise<void> {
    const current = await this.getQueue()
    await storage.setItem<LatexHistory[]>(LATEX_HISTORY, [...current, item].slice(-MAX_LENGTH))
  },

  // Reads all saved copy-history entries from local extension storage.
  async getQueue(): Promise<LatexHistory[]> {
    return (await storage.getItem<LatexHistory[]>(LATEX_HISTORY)) || []
  },

  // Removes selected history entries by their stable ids.
  async remove(idList: string[]) {
    const current = await this.getQueue()
    await storage.setItem<LatexHistory[]>(
      LATEX_HISTORY,
      current.filter((item) => !idList.includes(item.id)),
    )
  },

  // Clears the local copy-history queue.
  async clear(): Promise<void> {
    await storage.setItem(LATEX_HISTORY, [])
  },

  // Streams history updates to the side panel while it is open.
  watch(cb: (newValue: LatexHistory[]) => void): Unwatch {
    return storage.watch<LatexHistory[]>(LATEX_HISTORY, (newValue) => newValue && cb(newValue))
  },
}

// Reads cached remote selector metadata, returning an empty cache shape when none exists.
export async function getPattern() {
  const pattern = await storage.getItem<PatternCache>(PATTERN)
  return pattern && Object.keys(pattern).length ? pattern : { data: [], time: Date.now() }
}

// Persists selector metadata fetched from the optional remote rules service.
export async function setPattern(data: Pattern[]) {
  await storage.setItem<PatternCache>(PATTERN, {
    time: Date.now(),
    data,
  })
}

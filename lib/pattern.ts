const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
import { getPattern as getPatternStorage, setPattern } from './storage'
import type { Pattern, PatternCache } from './storage/types'

const SYNC_HOUR = 3

let patternCache: PatternCache = { data: [], time: 0 }

// Finds the first remote rule whose configured domain matches the current page.
function getRule(patternList: Pattern[], domain: string) {
  return (patternList || []).find((rule) => rule.domain.find(domainMatch(domain)))
}

// Resolves selector-rule metadata from memory, storage, or the optional remote service.
export async function getPattern(
  { forceUpdate = false, domain = '' },
  cb?: (message: unknown) => void,
) {
  if (!patternCache.time) {
    patternCache = await getPatternStorage()
  }
  let ruleTarget = getRule(patternCache.data, domain)
  // Refreshes when forced, missing, or expired so remote rule changes can land.
  if (
    forceUpdate ||
    !patternCache.data?.length ||
    Date.now() - patternCache.time >= 1000 * 60 * 60 * SYNC_HOUR
  ) {
    // Clears stale in-memory metadata before fetching the optional remote rules.
    patternCache.time = 0
    const patternList = await patternApi()
    setPattern(patternList)
    patternCache.time = Date.now()
    patternCache.data = patternList
    ruleTarget = getRule(patternList, domain)
  }
  cb?.(ruleTarget?.rule_key ?? '')
}

// Refreshes remote selector metadata after install/update.
export function refreshPattern() {
  getPattern({ forceUpdate: true })
}

// Matches exact domains and subdomains used by remote selector rules.
function domainMatch(domain: string) {
  return (item: string) => domain === item || domain.endsWith(item)
}

// Fetches optional remote selector metadata; empty output means "use built-in rules only".
async function patternApi(): Promise<Pattern[]> {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase URL or Key is missing. Fallback to local rules.')
    return []
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/latex`, {
      method: 'GET',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    // Keeps built-in selector rules usable when the optional remote service fails.
    console.error('Failed to fetch patterns:', error)
    return []
  }
}

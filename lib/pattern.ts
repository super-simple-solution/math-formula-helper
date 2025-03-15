const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY
import { getPattern as getPatternStorage, setPattern } from "./storage"
import type { Pattern, PatternCache } from "./storage/types"

const SYNC_HOUR = 3

let patternCache:PatternCache = { data: [], time: 0 }

function getRule(patternList: Pattern[], domain: string) {
  return (patternList || []).find((rule) => rule.domain.find(domainMatch(domain)))
}

// 内存cache/storage/远端
export async function getPattern({ forceUpdate = false, domain = ''}, cb?: (message: unknown) => void) {
  if (!patternCache.time) {
    patternCache = await getPatternStorage()
  }
  let ruleTarget = getRule(patternCache.data, domain)
  // 强制刷新/本地无缓存/缓存过期
  if (forceUpdate || !patternCache.data?.length || Date.now() - patternCache.time >= 1000 * 60 * 60 * SYNC_HOUR) {
    // reset cache
    patternCache.time = 0
    const patternList = await patternApi()
    setPattern(patternList)
    patternCache.time = Date.now()
    patternCache.data = patternList
    ruleTarget = getRule(patternList, domain)
  }
  // biome-ignore lint/complexity/useOptionalChain: <explanation>
  cb && cb(ruleTarget ? ruleTarget.rule_key: '')
}

export function refreshPattern() {
  getPattern({ forceUpdate: true })
}

function domainMatch(domain: string) {
  return (item: string) => domain === item || domain.endsWith(item)
}

async function patternApi(): Promise<Pattern[]> {
  return await fetch(`${supabaseUrl}/rest/v1/latex`, {
    method: 'GET',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  }).then(res => res.json())
}
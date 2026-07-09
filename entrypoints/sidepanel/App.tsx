import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  buildHtmlClipboardDocument,
  normalizeMathmlForClipboard,
  writeClipboardPayload,
  type FormulaClipboardPayload,
} from '@/lib/clipboard-payload'
import { sendBrowserMessage } from '@/lib/extension-action'
import {
  defaultBracePolicy,
  defaultEnvironmentPolicy,
  defaultHistoryValueMode,
  defaultLatexSymbol,
  defaultNormalization,
  defaultOutputProfile,
  defaultTagPolicy,
  HistoryValueMode,
  OutputProfile,
  latexFormat,
} from '@/lib/latex'
import {
  type LatexHistory,
  LatexQueue,
  type Prefer,
  getPreference,
  watchPreference,
} from '@/lib/storage'
import { toast } from '@/lib/toast'
import { Copy, FileStack, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Placeholder } from './components/placeholder'
import { formInit } from './const'

type HistoryMap = Record<string, LatexHistory>

// Normalizes tab URLs so hash-only navigation shares the same copy-history bucket.
function stripUrlHash(url: string) {
  return url.split('#')[0]
}

// Resolves the text to copy from history using the saved value mode and current preferences.
function getHistoryCopyContent(item: LatexHistory, prefer: Prefer) {
  if (item.valueMode === HistoryValueMode.Formatted) return item.formatted || item.value

  if (
    prefer.history_value === HistoryValueMode.Formatted ||
    prefer.history_value === HistoryValueMode.Both
  ) {
    return item.formatted || latexFormat(item.value, prefer, { displayMode: item.displayMode })
  }

  return latexFormat(item.value, prefer, { displayMode: item.displayMode })
}

// Rebuilds a full clipboard payload for a history item, including Word Native MathML when possible.
async function getHistoryClipboardPayload(
  item: LatexHistory,
  prefer: Prefer,
): Promise<FormulaClipboardPayload> {
  const text = getHistoryCopyContent(item, prefer)
  const mathml =
    item.mathml ||
    (prefer.output_profile === OutputProfile.WordNative
      ? await convertHistoryLatexToMathml(item)
      : undefined)
  const htmlFragment =
    prefer.output_profile === OutputProfile.WordNative && mathml
      ? normalizeMathmlForClipboard(mathml, item.displayMode)
      : ''

  return {
    text,
    htmlFragment: htmlFragment || undefined,
    html: htmlFragment ? buildHtmlClipboardDocument(htmlFragment) : undefined,
  }
}

// Converts a saved LaTeX history item to MathML with the extension-owned converter.
async function convertHistoryLatexToMathml(item: LatexHistory) {
  try {
    const mathml = await sendBrowserMessage({
      greeting: 'convert-tex-to-local-mathml',
      data: {
        tex: item.value,
        displayMode: item.displayMode,
      },
    })
    return typeof mathml === 'string' && mathml.trim().startsWith('<math') ? mathml : undefined
  } catch {
    return undefined
  }
}

// Writes one history payload to the clipboard and confirms the action to the user.
async function writeHistoryClipboardPayload(payload: FormulaClipboardPayload) {
  await writeClipboardPayload(navigator.clipboard, payload)
  toast({
    text: 'Copied Successful. ✨',
  })
}

// Renders and manages the per-tab LaTeX copy history side panel.
function SiderPanelApp() {
  const [list, setList] = useState<LatexHistory[]>([])
  const curMapRef = useRef<HistoryMap>({})
  const [historyList, setHistoryList] = useState<LatexHistory[]>([])
  const tabIdRef = useRef(0)
  const [tabUrl, setTabUrl] = useState<string>()

  const preferRef = useRef<Prefer>({
    show_toast: false,
    show_source_quality: true,
    selection_copy: true,
    history_value: defaultHistoryValueMode,
    output_profile: defaultOutputProfile,
    format_signs: defaultLatexSymbol,
    normalization: defaultNormalization,
    tag_policy: defaultTagPolicy,
    environment_policy: defaultEnvironmentPolicy,
    brace_policy: defaultBracePolicy,
  })

  const form = useForm({
    defaultValues: formInit(),
  })

  // Loads the full history queue or accepts a watched queue update.
  const getList = (list: LatexHistory[]) => {
    const promise = list.length ? Promise.resolve(list) : LatexQueue.getQueue()
    promise.then((res) => {
      setHistoryList(res)
    })
  }

  // Joins selected history entries for multi-copy actions.
  const getContent = (idList: string[]) => {
    if (!curMapRef.current) return ''
    const contentList = idList.map((id) => {
      if (curMapRef.current[id]) {
        return getHistoryCopyContent(curMapRef.current[id], preferRef.current)
      }
      return ''
    })
    return contentList.join(',')
  }

  // Keeps current preferences in a ref so event handlers do not use stale state.
  const setPrefer = (prefer: Prefer) => {
    preferRef.current = prefer
  }

  // Reads the active tab so history can be filtered to the current page.
  const getTabInfo = () => {
    return sendBrowserMessage({
      greeting: 'get-active-tab',
    }).then((tab) => {
      const { url, id } = tab as chrome.tabs.Tab
      if (url && id) {
        tabIdRef.current = id
        setTabUrl(stripUrlHash(url))
      }
      return true
    })
  }

  // Updates the current history filter when the active tab navigates.
  const handleTabUpdated = async (tabId: number, changeInfo: { url?: string }) => {
    if (tabId !== tabIdRef.current) return
    if (changeInfo.url) {
      setTabUrl(stripUrlHash(changeInfo.url))
    }
  }

  useEffect(() => {
    setList(historyList.filter((item) => item.url === tabUrl))
  }, [tabUrl, historyList])

  useEffect(() => {
    const newItemMap = list.reduce((map, item) => {
      map[item.id] = item
      return map
    }, {} as HistoryMap)
    curMapRef.current = newItemMap
  }, [list])

  useEffect(() => {
    getTabInfo().then(() => getList([]))
    getPreference().then(setPrefer)
    browser.tabs.onUpdated.addListener(handleTabUpdated)
    const unwatchLatex = LatexQueue.watch(getList)
    const unwatchPrefer = watchPreference(setPrefer)
    return () => {
      browser.tabs.onUpdated.removeListener(handleTabUpdated)
      unwatchLatex()
      unwatchPrefer()
    }
  }, [])

  // Copies selected history rows or asks the user to select at least one.
  const copySelected = async () => {
    const { idList } = form.getValues()
    const ids = idList.filter(Boolean)
    if (!ids.length) {
      toast({
        text: 'You have to select at least one item.',
      })
      return
    }
    copyLatex(ids)
  }

  // Copies one history item with rich payload metadata, or multiple items as joined text.
  const copyLatex = async (idList: string[]) => {
    const singleItem = idList.length === 1 ? curMapRef.current[idList[0]] : undefined
    const payload = singleItem
      ? await getHistoryClipboardPayload(singleItem, preferRef.current)
      : { text: getContent(idList) }
    await writeHistoryClipboardPayload(payload)
  }

  // Removes every history item visible for the current page.
  const clearAllHistory = async () => {
    await LatexQueue.remove(list.map((item) => item.id))
    form.reset(formInit())
    toast({
      text: 'All the history on this page has been removed successfully.',
    })
  }

  // Deletes the currently selected history rows.
  const removeSelectedHistory = () => {
    const { idList } = form.getValues()
    LatexQueue.remove(idList)
    toast({
      text: 'Deleted successfully.',
    })
  }

  return (
    <div>
      <div className="mt-4 ml-2 text-lg">Latex copying history</div>
      {list.length ? (
        <div>
          <div className="flex justify-end gap-4 px-4">
            <Popover>
              <PopoverTrigger>
                <div className="cursor-pointer rounded-lg border border-red-500 p-1 text-red-500 hover:bg-red-50 hover:text-red-500">
                  <Trash2 size="20" />
                </div>
              </PopoverTrigger>
              <PopoverContent>
                <div className="flex justify-around">
                  <Button size="sm" variant="destructive" onClick={clearAllHistory}>
                    Clear All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-500 hover:bg-white hover:text-red-600"
                    onClick={removeSelectedHistory}
                  >
                    Delete Selected
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div
                    className="cursor-pointer rounded-lg border border-green-500 p-1 text-green-500 hover:bg-green-50 hover:text-green-500"
                    onClick={copySelected}
                  >
                    <FileStack size="20" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Copy Selected Content</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Form {...form}>
            <form className="space-y-8">
              <FormField
                control={form.control}
                name="idList"
                render={() => (
                  <FormItem>
                    <div className="px-4">
                      <div className="my-4 rounded-lg border border-green-500 bg-green-50 p-2 text-green-500">
                        💡 Select some from the list below to copy
                      </div>
                    </div>
                    {list.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="idList"
                        render={({ field }) => {
                          return (
                            <FormItem key={item.id} className="w-full">
                              <div className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-2 hover:bg-muted">
                                <div className="flex w-full items-center ">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value.includes(item.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, item.id])
                                          : field.onChange(
                                              field.value?.filter((value) => value !== item.id),
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="w-full cursor-pointer overflow-hidden pl-3 font-normal text-xs leading-6">
                                    <span className="block truncate">
                                      {item.formatted || item.value}
                                    </span>
                                    {item.sourceKind && (
                                      <span className="block truncate text-muted-foreground">
                                        {item.sourceKind}
                                        {item.quality ? `, ${item.quality}` : ''}
                                      </span>
                                    )}
                                    {item.warnings?.map((warning) => (
                                      <span
                                        key={warning}
                                        className="block truncate text-muted-foreground"
                                      >
                                        {warning}
                                      </span>
                                    ))}
                                  </FormLabel>
                                </div>
                                <div className="flex flex-auto items-center justify-end">
                                  <Copy
                                    onClick={() => copyLatex([item.id])}
                                    className="cursor-pointer text-green-500"
                                    size="14"
                                  />
                                </div>
                              </div>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
      ) : (
        <Placeholder />
      )}
    </div>
  )
}

export default SiderPanelApp

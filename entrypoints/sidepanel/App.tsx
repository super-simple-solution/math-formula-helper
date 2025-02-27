import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/lib'
import { sendBrowserMessage } from '@/lib/extension-action'
import { LatexSymbol, latexFormat } from '@/lib/latex'
import {
  type LatexHistory,
  LatexQueue,
  type Prefer,
  getPreference,
  watchPreference,
} from '@/lib/storage'
import { Copy, FileStack, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Tabs } from 'wxt/browser'
import { Placeholder } from './components/placeholder'
import { formInit } from './const'
import 'katex/dist/katex.min.css'

type HistoryMap = Record<string, LatexHistory>

function urlParse(url: string) {
  return url.split('#')[0]
}

async function copy(content: string) {
  await navigator.clipboard.writeText(content)
  toast({
    text: 'Copied Successful. ✨',
  })
}

function SiderPanelApp() {
  const [list, setList] = useState<LatexHistory[]>([])
  const curMapRef = useRef<HistoryMap>({})
  const [historyList, setHistoryList] = useState<LatexHistory[]>([])
  const tabIdRef = useRef(0)
  const [tabUrl, setTabUrl] = useState<string>()

  const preferRef = useRef<Prefer>({
    show_toast: false,
    format_signs: LatexSymbol.Inline,
  })

  const form = useForm({
    defaultValues: formInit(),
  })

  const getList = (list: LatexHistory[]) => {
    const promise = list.length ? Promise.resolve(list) : LatexQueue.getQueue()
    promise.then((res) => {
      setHistoryList(res)
    })
  }

  const getContent = (idList: string[]) => {
    if (!curMapRef.current) return ''
    const contentList = idList.map((id) => {
      if (curMapRef.current[id]) {
        curMapRef.current[id].value
        return latexFormat(curMapRef.current[id].value, preferRef.current)
      }
      return ''
    })
    return contentList.join(',')
  }

  const setPrefer = (prefer: Prefer) => {
    preferRef.current = prefer
  }

  const getTabInfo = () => {
    return sendBrowserMessage({
      greeting: 'get-active-tab',
    }).then((tab) => {
      const { url, id } = tab as Tabs.Tab
      if (url && id) {
        tabIdRef.current = id
        setTabUrl(urlParse(url))
      }
      return true
    })
  }

  const handleTabUpdated = async (tabId: number, changeInfo: { url?: string }) => {
    console.log(tabIdRef.current, 'tabInfoRef.current')
    if (tabId !== tabIdRef.current) return
    if (changeInfo.url) {
      setTabUrl(urlParse(changeInfo.url))
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

  const copyLatex = async (idList: string[]) => {
    const content = getContent(idList)
    await copy(content)
  }

  const clearAllHistory = async () => {
    await removeHistory(list.map((item) => item.id))
    form.reset(formInit())
    toast({
      text: 'All the history on this page has been removed successfully.',
    })
  }

  const removeHistory = async (idList: string[]) => {
    await LatexQueue.remove(idList)
  }

  const removeSelectedHistory = () => {
    const { idList } = form.getValues()
    removeHistory(idList)
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
                                <div className="flex min-w-[250px] items-center">
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
                                  <FormLabel className="cursor-pointer overflow-hidden pl-3 font-normal text-xs leading-6">
                                    {item.value}
                                  </FormLabel>
                                </div>
                                <div className="flex flex-auto items-center justify-end gap-2">
                                  {/* katex */}
                                  {/* <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info size="14" className="cursor-pointer text-gray-500" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <div className="max-w-[300px]">{item.value}</div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider> */}
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

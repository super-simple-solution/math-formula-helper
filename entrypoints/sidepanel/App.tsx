import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/lib'
import { sendBrowserMessage } from '@/lib/extension-action'
import { latexFormat } from '@/lib/latex'
import {
  type LatexHistory,
  LatexQueue,
  type Prefer,
  getPreference,
  watchPreference,
} from '@/lib/storage'
import { Copy, FileStack, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Tabs } from 'wxt/browser'
import { Placeholder } from './components/placeholder'
import { formInit } from './const'

type HistoryMap = Record<string, LatexHistory>

async function copy(content: string) {
  await navigator.clipboard.writeText(content)
  toast({
    text: 'Copied Successful. ✨',
  })
}
// TODO: when active url update, get url
function SiderPanelApp() {
  const [list, setList] = useState<LatexHistory[]>([])
  const [map, setMap] = useState<HistoryMap>()
  const [historyList, setHistoryList] = useState<LatexHistory[]>([])
  const [tabUrl, setTabUrl] = useState<string>()
  const [prefer, setPrefer] = useState<Prefer>()

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
    if (!map) return ''
    const contentList = idList.map((id) => {
      if (map[id] && prefer) {
        map[id].value
        return latexFormat(map[id].value, prefer)
      }
      return ''
    })
    return contentList.join(',')
  }

  const getTabUrl = () => {
    return sendBrowserMessage({
      greeting: 'get-active-tab',
    }).then((tab) => {
      const url = (tab as Tabs.Tab).url
      if (url?.startsWith('http')) {
        setTabUrl(url)
      }
      return true
    })
  }

  const handleTabActivated = async (activeInfo: { tabId: number }) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId)
      if (tab?.url) {
        setTabUrl(tab.url)
      }
    } catch (error) {
      console.error('Failed to get tab details:', error)
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
    setMap(newItemMap)
  }, [list])

  useEffect(() => {
    getTabUrl().then(() => getList([]))
    getPreference().then(setPrefer)
    browser.tabs.onActivated.addListener(handleTabActivated)
    const unwatchLatex = LatexQueue.watch(getList)
    const unwatchPrefer = watchPreference(setPrefer)
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated)
      unwatchLatex()
      unwatchPrefer()
    }
  }, [])

  const copySelected = async () => {
    const { idList } = form.getValues()
    console.log(idList, 'copySelected data')
    if (!idList.length) {
      toast({
        text: 'You have to select at least one item.',
      })
      return
    }
    copyLatex(idList)
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
    console.log(idList, 'remove data')
    removeHistory(idList)
    toast({
      text: 'Clear successfully!',
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
                    Clear Selected
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
                        💡 Choose an option below to copy
                      </div>
                    </div>
                    {list.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="idList"
                        render={({ field }) => {
                          return (
                            <FormItem key={item.id}>
                              <div className="flex cursor-pointer flex-row items-center gap-2 space-y-0 px-4 py-2 hover:bg-muted">
                                <div className="flex flex-1 items-center">
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
                                  <FormLabel className="cursor-pointer pl-3 font-normal leading-6">
                                    {item.value}
                                  </FormLabel>
                                </div>
                                <div className="flex flex-end items-center gap-2">
                                  <Trash2
                                    onClick={() => removeHistory([item.id])}
                                    className="cursor-pointer text-red-500"
                                    size="16"
                                  />
                                  <Copy
                                    onClick={() => copyLatex([item.id])}
                                    className="cursor-pointer text-green-500"
                                    size="16"
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

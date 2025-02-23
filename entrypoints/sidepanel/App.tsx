import EmptyImg from '@/assets/images/svg/empty.svg'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/lib'
import { sendBrowserMessage } from '@/lib/extension-action'
import { type LatexHistory, LatexQueue } from '@/lib/storage'
import { Copy, FileStack, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Tabs } from 'wxt/browser'
import { formInit } from './const'

type HistoryMap = Record<string, LatexHistory>

function SiderPanelApp() {
  const [historyList, setHistoryList] = useState<LatexHistory[]>([])
  const [historyMap, setHistoryMap] = useState<HistoryMap>()
  const [tabUrl, setTabUrl] = useState<string>()
  const form = useForm({
    defaultValues: formInit(),
  })

  const getList = (list: LatexHistory[]) => {
    const promise = list.length ? Promise.resolve(list) : LatexQueue.getQueue()
    promise.then((res) => {
      setHistoryList(res.filter((item) => item.url === tabUrl))
      setHistoryMap
    })
  }

  const getContent = (idList: string[]) => {
    if (!historyMap) return ''
    // TODO: 用户当前选择的格式
    // latexFormat(alt, preferData.format_signs)
    return idList.map(id => historyMap[id] ? historyMap[id].value: '').join(',')
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
    if (tabUrl) {
      getList([])
    }
  }, [tabUrl])

  useEffect(() => {
    const newItemMap = historyList.reduce((map, item) => {
      map[item.id] = item
      return map
    }, {} as HistoryMap)
    setHistoryMap(newItemMap)
  }, [historyList])

  useEffect(() => {
    getTabUrl()
    browser.tabs.onActivated.addListener(handleTabActivated)
    const unwatch = LatexQueue.watch((newList) => {
      // 刷新sidepanel页时，没有初始化tabUrl
      // const promise = tabUrl ? Promise.resolve(true) : getTabUrl()
      // promise.then(() => getList(newList))
      getList(newList)
    })
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated)
      unwatch()
    }
  }, [])

  const copySelected = async () => {
    const { items } = form.getValues()
    if (!items.length) {
      toast({
        text: 'You have to select at least one item.',
      })
      return
    }
    const content = getContent(items)
    await navigator.clipboard.writeText(content)
    toast({
      text: 'Copied Successful. ✨',
    })
  }

  const clearAllHistory = async () => {
    await LatexQueue.clear()
    form.reset(formInit())
    toast({
      text: 'All history has been cleared successfully!',
    })
  }

  const removeHistory = (idList: string[]) => {
    LatexQueue.remove(idList)
  }

  const removeSelectedHistory = () => {
    const data = form.getValues()
    // const filteredHistoryList = historyList.filter(item => !data.includes(item.value))
    // setHistoryList()
    toast({
      text: 'Clear successfully!',
    })
  }

  return (
    <div>
      <div className="mt-4 ml-2 text-lg">Latex copying history</div>
      {historyList.length ? (
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
                name="items"
                render={() => (
                  <FormItem>
                    <div className="px-4">
                      <div className="my-4 rounded-lg border border-green-500 bg-green-50 p-2 text-green-500">
                        💡 Choose an option below to copy
                      </div>
                    </div>
                    {historyList.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="items"
                        render={({ field }) => {
                          return (
                            <FormItem key={item.id}>
                              <div className="flex cursor-pointer flex-row items-center space-y-0 px-4 py-2 hover:bg-muted">
                                <div className="flex-1">
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
                                  <FormLabel className="cursor-pointer pl-3 font-normal">
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
                                    onClick={() => copyLatex(item.value)}
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
        <div className="mt-20 flex h-full flex-col items-center justify-center px-4">
          <img src={EmptyImg} alt="" className="w-[100px]" />
          <div className="mt-10 text-gray-500">
            No history yet. Copy a LaTeX formula from any page to get started.
          </div>
        </div>
      )}
    </div>
  )
}

export default SiderPanelApp

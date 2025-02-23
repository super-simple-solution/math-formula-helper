import EmptyImg from '@/assets/images/svg/empty.svg'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Popover, PopoverContent } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/lib'
import { LatexQueue } from '@/lib/storage'
import { PopoverTrigger } from '@radix-ui/react-popover'
import { FileStack, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { type Option, formInit } from './const'

function getContent(data: { items: string[] }) {
  return data.items.map((item: string) => item.replace(/^\d+\_/, ''))
}

function SiderPanelApp() {
  const [historyList, setHistoryList] = useState<Option[]>([])
  const form = useForm({
    defaultValues: formInit(),
  })

  useEffect(() => {
    LatexQueue.getQueue().then((res) => {
      const optionList: Option[] = res.map((item, index) => ({
        id: `${index}_${item.content}`,
        value: item.content,
      }))
      setHistoryList(optionList)
    })
  })

  const copySelected = () => {
    const data = form.getValues()
    if (!getContent(data).length) {
      toast({
        text: 'You have to select at least one item.',
      })
      return
    }
    toast({
      text: 'Copied Successful. ✨',
    })
    console.log(getContent(data), 'values')
  }

  const clearAllHistory = async () => {
    await LatexQueue.clear()
    form.reset(formInit())
    setHistoryList([])
    toast({
      text: 'All history has been cleared successfully!',
    })
  }

  const clearSelectedHistory = () => {
    // const data = form.getValues()
    // const filteredHistoryList = historyList.filter(item => !data.includes(item.value))
    // setHistoryList()
    toast({
      text: 'Clear successfully!',
    })
  }

  return (
    <div>
      <div className="mt-4 ml-2 text-lg">Latex copied history</div>
      {historyList.length ? (
        <div>
          <div className="flex justify-end gap-4 px-4">
            <Popover>
              <PopoverTrigger>
                <Button variant="destructive">
                  <Trash2 />
                </Button>
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
                    onClick={clearSelectedHistory}
                  >
                    Clear Selected
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-50 hover:text-green-500"
                    onClick={copySelected}
                  >
                    <FileStack />
                  </Button>
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
                        Choose an option below to copy
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
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
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
            ❗❗❗ No history yet. Copy a LaTeX formula from any page to get started!
          </div>
        </div>
      )}
    </div>
  )
}

export default SiderPanelApp

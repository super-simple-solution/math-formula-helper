import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { toast } from '@/lib'
import { LatexQueue } from '@/lib/storage'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileStack, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Option } from './const'

const FormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one item.',
  }),
})

function getContent(data: z.infer<typeof FormSchema>) {
  return data.items.map((item) => item.replace(/^\d+\_/, ''))
}

function SiderPanelApp() {
  const [historyList, setHistoryList] = useState<Option[]>([])

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: [],
    },
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
    console.log(getContent(data), 'values')
  }

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log(getContent(data), 'data')
    toast({
      text: 'You submitted the following values:',
    })
  }

  return (
    <div>
      <div className="mt-4 ml-2 text-lg">Latex copied history</div>
      <div className="flex justify-end">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div className="px-2" onClick={copySelected}>
                <FileStack />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear All</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <div>
                <Trash2 />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy Selected Content</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="items"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-base">Sidebar</FormLabel>
                  <FormDescription>
                    Select the items you want to display in the sidebar.
                  </FormDescription>
                </div>
                {historyList.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="items"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={item.id}
                          className="flex cursor-pointer flex-row items-center space-x-3 space-y-0 hover:bg-muted"
                        >
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
                          <FormLabel htmlFor={item.id} className="font-normal text-lg">
                            {item.value}
                          </FormLabel>
                        </FormItem>
                      )
                    }}
                  />
                ))}
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Submit</Button>
        </form>
      </Form>

      {/* {historyList?.map((item, index) => (
        <div
          className="flex cursor-pointer items-center space-x-2 p-2 font-medium hover:bg-muted"
          key={`${item.content}_${index}`}
        >
          <Checkbox id={`${item.content}_${index}`} />
          <label
            htmlFor={`${item.content}_${index}`}
            className="cursor-pointer text-sm leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {item.content}
          </label>
        </div>
      ))} */}
    </div>
  )
}

export default SiderPanelApp

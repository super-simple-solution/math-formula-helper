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
import { type LatexHistory, LatexQueue } from '@/lib/storage'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileStack, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const FormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'You have to select at least one item.',
  }),
})

function SiderPanelApp() {
  const [historyList, setHistoryList] = useState<LatexHistory[]>([])

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: [],
    },
    values: { items: historyList.map(({ content }) => content) },
  })

  useEffect(() => {
    LatexQueue.getQueue().then((res) => {
      setHistoryList(res)
    })
  })

  const copySelected = () => {}

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log(data, 'data')
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
                {historyList.map((item, index) => (
                  <FormField
                    key={`${item.content}_${index}`}
                    control={form.control}
                    name="items"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={`${item.content}_${index}`}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(`${item.content}_${index}`)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, `${item.content}_${index}`])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== `${item.content}_${index}`,
                                      ),
                                    )
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal text-sm">{item.content}</FormLabel>
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

      {historyList?.map((item, index) => (
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
      ))}
    </div>
  )
}

export default SiderPanelApp

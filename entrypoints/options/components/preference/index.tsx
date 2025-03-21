import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { defaultLatexSymbol, parserMap } from '@/lib/latex'
import { type Prefer, getPreference, setPreference } from '@/lib/storage'
import { toast } from '@/lib/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { FormSchema, latexDemo, symbolList } from './const'

export function Preference() {
  const [prefer, setPrefer] = useState<Prefer>()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      format_signs: defaultLatexSymbol,
      show_toast: true,
    },
    values: prefer,
  })

  useEffect(() => {
    getPreference().then((res) => {
      setPrefer(res)
    })
  }, [])

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setPreference(data)
    toast({
      text: 'Your preference Saved',
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <div>
          <h3 className="mb-4 font-medium text-lg">Preference</h3>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="format_signs"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Latex Format</FormLabel>
                    <FormDescription>
                      To insert specified characters before and after LaTeX code so that it displays
                      normally when pasted.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value}>
                      {symbolList.map((item) => (
                        <div
                          key={item.symbol}
                          className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-2 hover:bg-muted"
                        >
                          <div className="flex items-center">
                            <RadioGroupItem {...field} value={item.symbol} id={item.symbol} />
                            <Label
                              className="ml-4 flex flex-1 cursor-pointer flex-row"
                              htmlFor={item.symbol}
                            >
                              <div className="w-48">{item.title}</div>
                              <div className="flex gap-2">
                                <div>{latexDemo}</div>
                                <div>=&gt;</div>
                                <div>{parserMap[item.symbol](latexDemo)}</div>
                              </div>
                            </Label>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="show_toast"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Show Toast</FormLabel>
                    <FormDescription>
                      Show a Toast message when copying LaTeX succeeds.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
        <Button type="submit">Save</Button>
      </form>
    </Form>
  )
}

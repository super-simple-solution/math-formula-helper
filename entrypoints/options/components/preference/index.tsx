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
import {
  defaultLatexSymbol,
  defaultNormalization,
  defaultOutputProfile,
  getOutputProfileDefaults,
  OutputProfile,
  parserMap,
} from '@/lib/latex'
import { type Prefer, getPreference, setPreference } from '@/lib/storage'
import { toast } from '@/lib/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { FormSchema, latexDemo, normalizationList, outputProfileList, symbolList } from './const'

export function Preference() {
  const [prefer, setPrefer] = useState<Prefer>()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      output_profile: defaultOutputProfile,
      format_signs: defaultLatexSymbol,
      normalization: defaultNormalization,
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
              name="output_profile"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Output Target</FormLabel>
                    <FormDescription>
                      Choose the environment where copied formulas are usually pasted.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value)
                        const defaults = getOutputProfileDefaults(value as OutputProfile)
                        form.setValue('format_signs', defaults.format_signs)
                        form.setValue('normalization', defaults.normalization)
                      }}
                      value={field.value}
                    >
                      {outputProfileList.map((item) => (
                        <div
                          key={item.value}
                          className="flex w-full cursor-pointer items-start gap-3 rounded-sm px-2 py-2 hover:bg-muted"
                        >
                          <RadioGroupItem value={item.value} id={item.value} className="mt-1" />
                          <Label className="cursor-pointer" htmlFor={item.value}>
                            <div>{item.title}</div>
                            <div className="text-muted-foreground text-xs">{item.desc}</div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
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
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      {symbolList.map((item) => (
                        <div
                          key={item.symbol}
                          className="flex w-full cursor-pointer items-start gap-3 rounded-sm px-2 py-2 hover:bg-muted"
                        >
                          <RadioGroupItem value={item.symbol} id={item.symbol} className="mt-1" />
                          <Label className="min-w-0 flex-1 cursor-pointer" htmlFor={item.symbol}>
                            <div>{item.title}</div>
                            <div className="text-muted-foreground text-xs">{item.desc}</div>
                            <code className="mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded bg-muted px-2 py-1 text-xs">
                              {parserMap[item.symbol](latexDemo)}
                            </code>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="normalization"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Normalize LaTeX</FormLabel>
                    <FormDescription>
                      Clean copied source for the renderer you usually paste into.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      {normalizationList.map((item) => (
                        <div
                          key={item.value}
                          className="flex w-full cursor-pointer items-start gap-3 rounded-sm px-2 py-2 hover:bg-muted"
                        >
                          <RadioGroupItem value={item.value} id={item.value} className="mt-1" />
                          <Label className="cursor-pointer" htmlFor={item.value}>
                            <div>{item.title}</div>
                            <div className="text-muted-foreground text-xs">{item.desc}</div>
                          </Label>
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

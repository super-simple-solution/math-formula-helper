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
  defaultBracePolicy,
  defaultEnvironmentPolicy,
  defaultHistoryValueMode,
  defaultLatexSymbol,
  defaultNormalization,
  defaultOutputProfile,
  defaultTagPolicy,
  getOutputProfileDefaults,
  LatexSymbol,
  OutputProfile,
  parserMap,
} from '@/lib/latex'
import { type Prefer, getPreference, setPreference } from '@/lib/storage'
import { toast } from '@/lib/toast'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import {
  bracePolicyList,
  environmentPolicyList,
  FormSchema,
  historyValueList,
  latexDemo,
  normalizationList,
  outputProfileList,
  symbolList,
  tagPolicyList,
} from './const'

export function Preference() {
  const [prefer, setPrefer] = useState<Prefer>()

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      output_profile: defaultOutputProfile,
      format_signs: defaultLatexSymbol,
      normalization: defaultNormalization,
      tag_policy: defaultTagPolicy,
      environment_policy: defaultEnvironmentPolicy,
      brace_policy: defaultBracePolicy,
      history_value: defaultHistoryValueMode,
      show_toast: true,
      show_source_quality: true,
      selection_copy: true,
    },
    values: prefer,
  })
  const watchedOutputProfile = form.watch('output_profile') ?? defaultOutputProfile

  useEffect(() => {
    getPreference().then((res) => {
      setPrefer(res)
    })
  }, [])

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    await setPreference(data)
    toast({
      text: 'Your preference Saved',
    })
  }

  function getSymbolPreview(symbol: LatexSymbol) {
    const resolvedSymbol =
      symbol === LatexSymbol.Auto
        ? getOutputProfileDefaults(watchedOutputProfile as OutputProfile).format_signs
        : symbol
    return parserMap[resolvedSymbol](latexDemo)
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
                      Choose the environment used by Auto options below.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      {outputProfileList.map((item) => (
                        <div
                          key={item.value}
                          className="flex w-full cursor-pointer items-start gap-3 rounded-sm px-2 py-2 hover:bg-muted"
                        >
                          <RadioGroupItem
                            value={item.value}
                            id={`output-profile-${item.value}`}
                            className="mt-1"
                          />
                          <Label className="cursor-pointer" htmlFor={`output-profile-${item.value}`}>
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
                    <FormLabel>Math Delimiters</FormLabel>
                    <FormDescription>
                      Choose the wrapper around copied formulas. Auto follows Output Target.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      {symbolList.map((item) => (
                        <div
                          key={item.symbol}
                          className="flex w-full cursor-pointer items-start gap-3 rounded-sm px-2 py-2 hover:bg-muted"
                        >
                          <RadioGroupItem
                            value={item.symbol}
                            id={`latex-format-${item.symbol}`}
                            className="mt-1"
                          />
                          <Label
                            className="min-w-0 flex-1 cursor-pointer"
                            htmlFor={`latex-format-${item.symbol}`}
                          >
                            <div>{item.title}</div>
                            <div className="text-muted-foreground text-xs">{item.desc}</div>
                            <code className="mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded bg-muted px-2 py-1 text-xs">
                              {getSymbolPreview(item.symbol)}
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
                      Choose cleanup behavior. Auto follows Output Target.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      {normalizationList.map((item) => (
                        <div
                          key={item.value}
                          className="flex w-full cursor-pointer items-start gap-3 rounded-sm px-2 py-2 hover:bg-muted"
                        >
                          <RadioGroupItem
                            value={item.value}
                            id={`normalization-${item.value}`}
                            className="mt-1"
                          />
                          <Label className="cursor-pointer" htmlFor={`normalization-${item.value}`}>
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
              name="tag_policy"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Tags And Labels</FormLabel>
                    <FormDescription>Control \\tag, \\label, \\notag and \\nonumber.</FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      {tagPolicyList.map((item) => {
                        const id = `tag-policy-${item.value}`
                        return (
                          <div
                            key={item.value}
                            className="flex w-full cursor-pointer items-start gap-3 rounded-sm px-2 py-2 hover:bg-muted"
                          >
                            <RadioGroupItem value={item.value} id={id} className="mt-1" />
                            <Label className="cursor-pointer" htmlFor={id}>
                              <div>{item.title}</div>
                              <div className="text-muted-foreground text-xs">{item.desc}</div>
                            </Label>
                          </div>
                        )
                      })}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="environment_policy"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Environments</FormLabel>
                    <FormDescription>Control equation, align, gather and multline wrappers.</FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      {environmentPolicyList.map((item) => {
                        const id = `environment-policy-${item.value}`
                        return (
                          <div
                            key={item.value}
                            className="flex w-full cursor-pointer items-start gap-3 rounded-sm px-2 py-2 hover:bg-muted"
                          >
                            <RadioGroupItem value={item.value} id={id} className="mt-1" />
                            <Label className="cursor-pointer" htmlFor={id}>
                              <div>{item.title}</div>
                              <div className="text-muted-foreground text-xs">{item.desc}</div>
                            </Label>
                          </div>
                        )
                      })}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="brace_policy"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Redundant Braces</FormLabel>
                    <FormDescription>Control cleanup for publisher-generated brace groups.</FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      {bracePolicyList.map((item) => {
                        const id = `brace-policy-${item.value}`
                        return (
                          <div
                            key={item.value}
                            className="flex w-full cursor-pointer items-start gap-3 rounded-sm px-2 py-2 hover:bg-muted"
                          >
                            <RadioGroupItem value={item.value} id={id} className="mt-1" />
                            <Label className="cursor-pointer" htmlFor={id}>
                              <div>{item.title}</div>
                              <div className="text-muted-foreground text-xs">{item.desc}</div>
                            </Label>
                          </div>
                        )
                      })}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="history_value"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>History Storage</FormLabel>
                    <FormDescription>Choose what the side panel keeps after a copy.</FormDescription>
                  </div>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      {historyValueList.map((item) => {
                        const id = `history-value-${item.value}`
                        return (
                          <div
                            key={item.value}
                            className="flex w-full cursor-pointer items-start gap-3 rounded-sm px-2 py-2 hover:bg-muted"
                          >
                            <RadioGroupItem value={item.value} id={id} className="mt-1" />
                            <Label className="cursor-pointer" htmlFor={id}>
                              <div>{item.title}</div>
                              <div className="text-muted-foreground text-xs">{item.desc}</div>
                            </Label>
                          </div>
                        )
                      })}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="selection_copy"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Selection Copy</FormLabel>
                    <FormDescription>Replace formulas inside selected text while copying.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="show_source_quality"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Show Source Quality</FormLabel>
                    <FormDescription>Include source and quality in copy toasts and history.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
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

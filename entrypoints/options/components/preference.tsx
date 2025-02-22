import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib'
import { LatexSymbol, defaultLatexSymbol, parserMap } from '@/lib/latex'
import { type Prefer, getPreference, setPreference } from '@/lib/storage'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import showToast from '@/assets/images/show_toast.png'
import hiddenToast from '@/assets/images/hidden_toast.png'

type SymbolItem = {
  symbol: LatexSymbol
  title: string
}

const symbolList: SymbolItem[] = [
  {
    symbol: LatexSymbol.Inline,
    title: '$...$',
  },
  {
    symbol: LatexSymbol.Block,
    title: '$$...$$',
  },
  {
    symbol: LatexSymbol.Square,
    title: '\\[...\\]',
  },
  {
    symbol: LatexSymbol.Empty,
    title: 'Do Nothing, Pure Latex',
  },
]

const FormSchema = z.object({
  format_signs: z
    .enum(Object.values(LatexSymbol) as [string, ...string[]])
    .default(defaultLatexSymbol),
  show_toast: z.boolean().default(true),
})

const latexDemo = '\\sqrt{x}'

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
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setPreference(data)
    toast({
      text: 'Your preference Saved',
    })
  }

  return (
    <div>
      <h3 className="mb-4 font-extrabold text-2xl">Preference</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
          <div>
            <div className="space-y-8">
              <FormField
                control={form.control}
                name="format_signs"
                render={({ field }) => (
                  <FormItem>
                    <div className="text-xl font-semibold mb-2">Latex Format</div>
                    <div className="rounded-xl border shadow-md py-5">
                      <FormControl>
                        <RadioGroup {...field} onValueChange={field.onChange} value={field.value}>
                          {symbolList.map((item) => (
                            <div
                              key={item.symbol}
                              className="w-full flex items-center justify-between gap-2 hover:bg-slate-100 px-10 py-3 cursor-pointer"
                              onClick={() => (field.value = item.symbol)}
                            >
                              <div className="flex items-center">
                                <RadioGroupItem value={item.symbol} id={item.symbol} />
                                <Label className="ml-4 cursor-pointer" htmlFor={item.symbol}>
                                  {item.title}
                                </Label>
                              </div>
                              <div className="w-[150px] flex gap-2">
                                <div>{latexDemo}</div>
                                <div>=&gt;</div>
                                <div>{parserMap[item.symbol](latexDemo)}</div>
                              </div>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <div className="text-gray-500 text-sm mt-4 px-10">
                        To insert specified characters before and after LaTeX code so that it
                        displays normally when pasted.
                      </div>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="show_toast"
                render={({ field }) => (
                  <FormItem>
                    <div className="text-xl font-semibold mb-2">Show Toast</div>
                    <div className="rounded-xl border shadow-md overflow-hidden">
                      <div className="bg-green-50 px-10 pt-8">
                        <img src={field.value ? showToast : hiddenToast} alt="" />
                      </div>
                      <div className="flex flex-row items-center justify-between px-10 py-5">
                        <div className="font-semibold">
                          Show a Toast message when copying LaTeX succeeds.
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
          <Button type="submit">Save</Button>
        </form>
      </Form>
    </div>
  )
}

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
import { toast } from '@/lib'
import { LatexSymbol, defaultLatexSymbol, parserMap } from '@/lib/latex'
import { type Prefer, getPreference, setPreference } from '@/lib/storage'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
  format_signs: z.string().default(LatexSymbol.Inline),
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
    console.log(data, 'data')
    // setPreference(data)
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
                    <RadioGroup defaultValue={field.value}>
                      {symbolList.map((item) => (
                        <div key={item.symbol} className="flex items-center space-x-2">
                          <div className="flex-1">
                            <RadioGroupItem value={item.symbol} id="r1" />
                            <Label className="ml-4" htmlFor={item.symbol}>
                              {item.title}
                            </Label>
                          </div>
                          <div className="flex">
                            <div className="flex-1">{latexDemo}</div>
                            <div className="">=&gt;</div>
                            <div className="flex-1">{parserMap[item.symbol](latexDemo)}</div>
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
                    <Switch checked={field.value} />
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

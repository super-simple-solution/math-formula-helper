import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/lib'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { storage } from 'wxt/storage'
import { z } from 'zod'

const FormSchema = z.object({
  dollar_signs: z.boolean().default(true),
  show_toast: z.boolean().default(true),
})

const latexDemo = '\\sqrt{x} => $$\\sqrt{x}$$'

export function Config() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      dollar_signs: true,
      show_toast: true,
    },
  })

  function onSubmit(data: z.infer<typeof FormSchema>) {
    toast({
      text: 'You submitted the following values:',
    })
  }

  return (
    <Form {...form}>
      <form className="w-full space-y-6">
        <div>
          <h3 className="mb-4 font-medium text-lg">Copy Config</h3>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="dollar_signs"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Add $$</FormLabel>
                    <FormDescription>
                      <div>Use double dollar signs ($$) to enclose math expressions in LaTeX.</div>
                      <div>Case: {latexDemo}</div>
                    </FormDescription>
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
      </form>
    </Form>
  )
}

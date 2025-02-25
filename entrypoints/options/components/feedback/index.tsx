import Email from '@/assets/images/svg/email.svg'
import Telegram from '@/assets/images/svg/telegram.svg'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/lib'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { z } from 'zod'
import { FormSchema } from './const'
import { feedbackApi, formInit, uploadImage } from './util'

export function Feedback() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: formInit(),
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    if (imageUrls.length > 4) {
      form.setError('image_urls', {
        type: 'manual',
        message: 'You can upload a maximum of 4 images.',
      })
      return
    }
    data.image_urls = imageUrls
    await feedbackApi(data)
    toast({
      text: 'Thank you! Your feedback has been received and is greatly appreciated! 🌟',
    })
  }
  const handleRemoveImage = (index: number) => {
    const newImageUrls = [...imageUrls]
    newImageUrls.splice(index, 1)
    setImageUrls(newImageUrls)
    if (newImageUrls.length <= 4) {
      form.clearErrors('image_urls')
    }
  }
  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const imageUrl = await uploadImage(file)
      if (imageUrl) {
        setImageUrls((prevUrls) => [...prevUrls, imageUrl])
      } else {
        console.error('Failed to upload image: No URL returned')
      }
    }
  }

  const triggerFileInput = () => {
    const fileInput = document.getElementById('picture') as HTMLInputElement
    fileInput?.click()
  }

  return (
    <div>
      <h3 className="mb-4 font-extrabold text-2xl">Feedback</h3>
      <div className="mb-8">
        <div className="font-bold text-xl">Contact Us</div>
        <div className="mt-4 rounded-lg border p-4 shadow">
          <div className="flex items-center gap-4 ">
            <a href="https://t.me/zp_mh" target="_blank" rel="noreferrer">
              <img src={Telegram} alt="" className="w-10" />
            </a>
            <a href="mailto:example@example.com">
              <img src={Email} alt="" className="w-10" />
            </a>
          </div>
          <div className="mt-2 text-gray-500">Chat with us on Telegram or send us an Email</div>
        </div>
      </div>
      <div>
        <div className="font-bold text-xl">Need Help? Let Us Know Your Issues</div>
        <div className="mt-4 rounded-lg border p-4 shadow-md">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
              <FormField
                control={form.control}
                name="problem"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-1 text-base">Problem</div>
                    <FormControl>
                      <Textarea
                        placeholder="Please describe the problem you encountered (required)"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-1 text-base">Web Link</div>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Please enter the web page link for the problem"
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-1 text-base">Email</div>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Please input your Email"
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image_urls"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-1 text-base">Image</div>
                    <div className="flex flex-wrap gap-2">
                      <div
                        onClick={triggerFileInput}
                        className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-md border bg-gray-100"
                      >
                        <div className="font-thin text-3xl">+</div>
                        <Input
                          {...field}
                          id="picture"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </div>
                      {imageUrls.map((image, index) => (
                        <div key={index} className="relative h-20 w-20 rounded-md">
                          <img src={image} alt="Preview" className="h-20 w-20 rounded-md" />
                          <div
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-[-6px] right-[-6px] flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-gray-50 text-sm"
                          >
                            x
                          </div>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Save</Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormSchema } from "./const"
import { useState } from "react"
import { formInit } from "./util"

export function Feedback() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: formInit()
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])

  const onSubmit = (data: z.infer<typeof FormSchema>) => {
    if (imageUrls.length > 4) {
      form.setError("image_urls", {
        type: "manual",
        message: "You can upload a maximum of 4 images."
      })
      return
    }
    data.image_urls = imageUrls
    console.log(data, 342534)
  }
  const handleRemoveImage = (index: number) => {
    const newImageUrls = [...imageUrls]
    newImageUrls.splice(index, 1)
    setImageUrls(newImageUrls)
    if (newImageUrls.length <= 4) {
      form.clearErrors("image_urls")
    }
  }
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setImageUrls([...imageUrls, imageUrl])
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    const fileInput = document.getElementById('picture') as HTMLInputElement
    fileInput?.click()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
          name="web_link"
          render={({ field }) => (
            <FormItem>
              <div className="mb-1 text-base">Web Link</div>
              <FormControl>
                <Input {...field} placeholder="Please enter the web page link for the problem" className="resize-none"/>
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
                <Input {...field} placeholder="Please input your Email" className="resize-none"/>
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
                <div onClick={triggerFileInput} className="border bg-gray-100 w-20 h-20 cursor-pointer rounded-md flex justify-center items-center">
                  <div className="text-3xl font-thin">+</div>
                  <Input {...field} id="picture" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </div>
                {imageUrls.map((image, index) => (
                  <div key={index} className="w-20 h-20 rounded-md relative">
                    <img src={image} alt="Image Preview" className="w-20 h-20 rounded-md"/>
                    <div
                      onClick={() => handleRemoveImage(index)}
                      className="absolute right-[-6px] top-[-6px] w-6 h-6 cursor-pointer text-sm bg-gray-50 flex justify-center items-center rounded-full"
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
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}

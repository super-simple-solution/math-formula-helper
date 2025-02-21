import * as z from 'zod'
export const FormSchema = z.object({
  problem: z.string().min(1, { message: 'Problem is required.' }),
  web_link: z.string().url({ message: 'Please enter a valid web link.' }),
  email: z
    .string()
    .email({
      message: 'Please enter a valid email address.',
    })
    .optional(),
  image_urls: z
    .array(z.string())
    .max(4, { message: 'You can upload a maximum of 4 images.' })
    .optional(),
})

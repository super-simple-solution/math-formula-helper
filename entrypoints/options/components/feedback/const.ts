import * as z from 'zod'

export type Feedback = {
  problem: string
  email?: string
  url?: string
  image_urls?: string[]
}

export const FormSchema = z.object({
  problem: z.string().min(1, { message: 'Problem description is required.' }),
  url: z.string().url({ message: 'Please enter a valid url.' }).optional().or(z.literal('')),
  email: z
    .string()
    .email({ message: 'Please enter a valid email address.' })
    .optional()
    .or(z.literal('')),
  image_urls: z
    .array(z.string())
    .max(4, { message: 'You can upload a maximum of 4 images.' })
    .optional(),
})

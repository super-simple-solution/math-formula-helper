import { type Feedback } from './const'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

export function formInit() {
  return {
    problem: '',
    email: '',
    url: '',
    image_urls: [],
  }
}

export async function feedbackApi(data: Feedback) {
  return await fetch(supabaseUrl + '/rest/v1/feedback', {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product: 'latex',
      ...data,
    }),
  })
}

const bucketName = 'feedback'
export async function uploadImage(file: File): Promise<string | null> {
  // 1. 定义文件路径
  const filePath = `uploads/${file.name}` // 文件路径，可以根据需要修改
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`
  const uploadResponse = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': file.type, // 设置文件类型
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.json()
    console.error('Error uploading file:', errorData)
    return null
  }

  // 3. 获取文件的公开 URL
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${filePath}`
  return publicUrl
}
